import React, { useState, useEffect } from 'react';
import { updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import ImageUploader from '../common/ImageUploader';
import { uploadUserProfilePhoto } from '../../services/storageService';
import { updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/firebase';

const ProfileWizard = ({ onComplete }) => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showApprovalToast, setShowApprovalToast] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [formData, setFormData] = useState({
    gender: '',
    dateOfBirth: '',
    phone: '',
    country: '',
    city: '',
    language: 'es',
    timezone: 'America/Asuncion',
    theme: 'light',
    privacyLevel: 'medium',
    emailUpdates: false,
    smsUpdates: false,
    notifications: false
  });

  // Nuevo usuario Google: step 0 = bienvenida + foto
  const isNewGoogleUser = !userData?.photoURL && currentUser?.providerData?.some(p => p.providerId === 'google.com');
  const totalSteps = userData?.role === 'professional' ? 1 : 4;

  // Detectar zona horaria automáticamente
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(prev => ({ ...prev, timezone }));
  }, []);

  // Si es nuevo usuario de Google sin foto, empezar en step 0
  useEffect(() => {
    if (isNewGoogleUser) {
      setCurrentStep(0);
    }
  }, [isNewGoogleUser]);



  // Aviso temporal para profesionales indicando envío y paso a completar perfil
  useEffect(() => {
    if (userData?.role === 'professional') {
      setShowApprovalToast(true);
      const timer = setTimeout(() => setShowApprovalToast(false), 7000);
      return () => clearTimeout(timer);
    }
  }, [userData]);

  const handleInputChange = (field, value) => {
    console.log(`🔄 Cambiando ${field} a:`, value);
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      console.log('📊 Nuevos datos del formulario:', newData);
      return newData;
    });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      if (!currentUser?.uid) {
        throw new Error('Sesión no válida. Vuelve a iniciar sesión.');
      }

      // Subir foto de perfil si fue seleccionada
      let photoURL = userData?.photoURL || currentUser?.photoURL || null;
      if (profilePhotoFile) {
        setIsUploadingPhoto(true);
        const uploadResult = await uploadUserProfilePhoto(
          profilePhotoFile,
          currentUser.uid,
          (progress) => setUploadProgress(progress)
        );
        setIsUploadingPhoto(false);
        if (uploadResult.success) {
          photoURL = uploadResult.url;
          // Actualizar foto en Firebase Auth
          await updateProfile(auth.currentUser, { photoURL });
        } else {
          console.warn('⚠️ Error al subir foto:', uploadResult.error);
        }
      }

      // Estructurar datos correctamente
      const userPayload = {
        // Información personal
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        phone: formData.phone || 'none',
        location: formData.city && formData.country ? `${formData.city}, ${formData.country}` : 'none',
        ...(photoURL && { photoURL }),

        // Preferencias regionales
        language: formData.language,
        timezone: formData.timezone,

        // Preferencias de interfaz
        theme: formData.theme,
        privacyLevel: formData.privacyLevel,

        // Preferencias de notificaciones
        preferences: {
          emailUpdates: formData.emailUpdates,
          smsUpdates: formData.smsUpdates,
          notifications: formData.notifications
        },

        // Completitud del perfil
        profileCompleteness: 100,
        updatedAt: new Date(),
        updatedBy: 'user'
      };


      console.log('📝 Guardando datos del perfil:', userPayload);
      console.log('🔍 Preferencias de notificaciones:', userPayload.preferences);

      // Actualizar/crear datos en Firestore (users)
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, userPayload);
      } else {
        await setDoc(userRef, userPayload, { merge: true });
      }

      // Si es profesional, reflejar datos básicos en su doc de professionals
      if (userData?.role === 'professional') {
        const profRef = doc(db, 'professionals', currentUser.uid);
        const profSnap = await getDoc(profRef);
        if (profSnap.exists()) {
          const profData = profSnap.data();
          await updateDoc(profRef, {
            phone: formData.phone || profData.phone || '',
            contact: {
              ...(profData.contact || {}),
              phone: formData.phone || profData.contact?.phone || '',
              email: profData.contact?.email || userData.email || currentUser.email || ''
            },
            location: formData.location || profData.location || '',
            timezone: formData.timezone,
            profileCompleteness: 100,
            updatedAt: new Date()
          });
          console.log('✅ Perfil profesional también actualizado en professionals');
        } else {
          console.warn('⚠️ No se encontró documento en professionals para actualizar; creando básico');
          await setDoc(profRef, {
            name: userData?.name || currentUser?.displayName || '',
            email: userData?.email || currentUser?.email || '',
            phone: formData.phone || '',
            contact: {
              email: userData?.email || currentUser?.email || '',
              phone: formData.phone || ''
            },
            location: formData.location || '',
            timezone: formData.timezone,
            profileCompleteness: 100,
            updatedAt: new Date()
          }, { merge: true });
        }
      }

      console.log('✅ Perfil completado exitosamente');
      onComplete();

      // Navegar a la ubicación correcta según el rol
      if (userData?.role === 'professional') {
        console.log('🔄 Navegando a /dashboard de profesional');
        navigate('/dashboard');
      } else {
        console.log('🔄 Navegando a /evaluacion-emocional después de completar perfil');
        navigate('/evaluacion-emocional');
      }
    } catch (error) {
      console.error('❌ Error al completar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  // Paso 0: Bienvenida y foto de perfil (solo para usuarios nuevos de Google sin foto)
  const renderStep0 = () => (
    <div className="space-y-6 text-center">
      {/* Leyenda de bienvenida */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 border border-primary-100">
        <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Completemos tu perfil</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Este paso no te llevará mucho tiempo y nos servirá para saber que sos una persona real
          y para encontrarte el profesional ideal.
        </p>
      </div>

      {/* Upload de foto */}
      <div className="text-left">
        <ImageUploader
          onFileSelected={setProfilePhotoFile}
          currentPhotoURL={userData?.photoURL || currentUser?.photoURL}
          uploadProgress={uploadProgress}
          isUploading={isUploadingPhoto}
          label="Foto de perfil"
          hint="Subir tu foto genera confianza con el profesional con quien consultarás. Usá una foto tuya real y clara."
        />
        {!profilePhotoFile && !userData?.photoURL && (
          <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Recomendamos subir una foto. Los usuarios con foto generan más confianza.</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">Información Personal</h3>
        <p className="text-sm text-gray-600">Completá tu información básica para personalizar tu experiencia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Género *
          </label>
          <select
            value={formData.gender}
            onChange={(e) => handleInputChange('gender', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            required
          >
            <option value="">Seleccionar género</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
            <option value="otro">Otro</option>
            <option value="prefiero-no-decir">Prefiero no decir</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Fecha de Nacimiento *
          </label>
          <input
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            required
          />
        </div>

        {userData?.role !== 'professional' && (
          <>
            <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <div className="phone-input-wrapper border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
            <PhoneInput
              international
              defaultCountry="PY"
              value={formData.phone}
              onChange={(val) => handleInputChange('phone', val || '')}
              className="w-full"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ubicación
          </label>
          <div className="grid grid-cols-2 gap-4">
            <select
              value={formData.country}
              onChange={(e) => {
                handleInputChange('country', e.target.value);
                // Si cambias de país, reseteas la ciudad
                handleInputChange('city', '');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              required
            >
              <option value="">Selecciona tu país</option>
              <option value="Paraguay">Paraguay</option>
              <option value="Argentina">Argentina</option>
              <option value="Brasil">Brasil</option>
              <option value="España">España</option>
              <option value="Estados Unidos">Estados Unidos</option>
            </select>
            <select
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
              required
              disabled={!formData.country}
            >
              <option value="">Selecciona tu ciudad</option>
              {formData.country === 'Paraguay' && (
                <>
                  <option value="Asunción">Asunción</option>
                  <option value="Ciudad del Este">Ciudad del Este</option>
                  <option value="Encarnación">Encarnación</option>
                  <option value="San Lorenzo">San Lorenzo</option>
                  <option value="Luque">Luque</option>
                </>
              )}
              {formData.country === 'Argentina' && (
                <>
                  <option value="Buenos Aires">Buenos Aires</option>
                  <option value="Córdoba">Córdoba</option>
                  <option value="Rosario">Rosario</option>
                  <option value="Mendoza">Mendoza</option>
                </>
              )}
              {formData.country === 'Brasil' && (
                <>
                  <option value="São Paulo">São Paulo</option>
                  <option value="Río de Janeiro">Río de Janeiro</option>
                  <option value="Brasilia">Brasilia</option>
                </>
              )}
              {formData.country === 'España' && (
                <>
                  <option value="Madrid">Madrid</option>
                  <option value="Barcelona">Barcelona</option>
                  <option value="Valencia">Valencia</option>
                </>
              )}
              {formData.country === 'Estados Unidos' && (
                <>
                  <option value="Miami">Miami</option>
                  <option value="Nueva York">Nueva York</option>
                  <option value="Los Ángeles">Los Ángeles</option>
                </>
              )}
            </select>
          </div>
        </div>
          </>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias Regionales</h3>
        <p className="text-sm text-gray-600 mb-6">Configura tu idioma y zona horaria para una mejor experiencia.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Idioma *
          </label>
          <select
            value={formData.language}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            required
          >
            <option value="es">Español</option>
            <option value="en">English</option>
            <option value="pt">Português</option>
            <option value="fr">Français</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Zona Horaria *
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => handleInputChange('timezone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
            required
          >
            <option value="America/Asuncion">Asunción (UTC-3)</option>
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
            <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
            <option value="America/New_York">Nueva York (UTC-5)</option>
            <option value="Europe/Madrid">Madrid (UTC+1)</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Interfaz y Confidencialidad</h3>
        <p className="text-sm text-gray-600 mb-6">Personaliza la apariencia y configura el nivel de confidencialidad para tu tratamiento.</p>
      </div>

      <div className="space-y-6">


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Nivel de Confidencialidad *
          </label>
          <div className="space-y-3">
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.privacyLevel === 'low'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => handleInputChange('privacyLevel', 'low')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Estándar</div>
                  <div className="text-sm text-gray-500">Datos compartidos con profesionales asignados</div>
                </div>
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              </div>
            </div>

            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.privacyLevel === 'medium'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => handleInputChange('privacyLevel', 'medium')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Restringido</div>
                  <div className="text-sm text-gray-500">Solo información esencial para el tratamiento</div>
                </div>
                <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
              </div>
            </div>

            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.privacyLevel === 'high'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => handleInputChange('privacyLevel', 'high')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">Máxima Confidencialidad</div>
                  <div className="text-sm text-gray-500">Información solo para tu terapeuta asignado</div>
                </div>
                <div className="w-4 h-4 rounded-full bg-red-500"></div>
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm text-blue-800 font-medium">Confidencialidad Médica</p>
                <p className="text-xs text-blue-700 mt-1">
                  Todos los datos están protegidos por secreto profesional y solo serán utilizados para tu tratamiento psicológico.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Notificaciones</h3>
        <p className="text-sm text-gray-600 mb-6">Configura cómo quieres recibir las notificaciones.</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Notificaciones por Email</div>
            <div className="text-sm text-gray-500">Recibir actualizaciones importantes por correo</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.emailUpdates}
              onChange={(e) => handleInputChange('emailUpdates', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Notificaciones por SMS</div>
            <div className="text-sm text-gray-500">Recibir alertas importantes por mensaje de texto</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.smsUpdates}
              onChange={(e) => handleInputChange('smsUpdates', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <div className="font-medium text-gray-900">Notificaciones Push</div>
            <div className="text-sm text-gray-500">Recibir notificaciones en la aplicación</div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formData.notifications}
              onChange={(e) => handleInputChange('notifications', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>
    </div>
  );

  const isStepValid = () => {
    if (currentStep === 0) return true; // Foto es opcional
    switch (currentStep) {
      case 1:
        return formData.gender && formData.dateOfBirth;
      case 2:
        return formData.language && formData.timezone;
      case 3:
        return formData.theme && formData.privacyLevel;
      case 4:
        return true; // Las notificaciones son opcionales
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {showApprovalToast && (
        <div className="fixed top-6 inset-x-0 flex justify-center z-50 px-4">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg w-full max-w-xl flex items-start space-x-3 animate-fade-in-up">
            <svg className="w-5 h-5 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-semibold">¡Datos enviados para aprobación!</p>
              <p className="text-green-100">Por favor completa tu perfil para acelerar la revisión.</p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Completa tu Perfil
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Ayúdanos a personalizar tu experiencia en Psicomatch
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          ></div>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg">
          {/* Step Content */}
          {currentStep === 0 && renderStep0()}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={() => {
                if (currentStep === 1 && isNewGoogleUser) setCurrentStep(0);
                else if (currentStep > 0) setCurrentStep(currentStep - 1);
              }}
              disabled={currentStep === 0 || (currentStep === 1 && !isNewGoogleUser)}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                (currentStep === 0 || (currentStep === 1 && !isNewGoogleUser))
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Anterior
            </button>

            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={() => {
                    if (currentStep === 0) setCurrentStep(1);
                    else nextStep();
                  }}
                  disabled={!isStepValid()}
                  className={`px-6 py-2 text-sm font-medium rounded-lg ${isStepValid()
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid()}
                  className={`px-6 py-2 text-sm font-medium rounded-lg ${isStepValid() && !loading
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {isUploadingPhoto ? 'Subiendo foto...' : 'Completando...'}
                    </span>
                  ) : 'Completar Perfil'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i + 1}
              className={`w-3 h-3 rounded-full ${i + 1 <= currentStep ? 'bg-primary-600' : 'bg-gray-300'
                }`}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileWizard;
