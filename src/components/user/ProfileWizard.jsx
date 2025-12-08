import React, { useState, useEffect } from 'react';
import { updateDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileWizard = ({ onComplete }) => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showApprovalToast, setShowApprovalToast] = useState(false);
  const [formData, setFormData] = useState({
    // Información personal
    gender: '',
    dateOfBirth: '',
    phone: '',
    location: '',
    language: 'es',
    timezone: '',

    // Preferencias
    theme: 'light',
    privacyLevel: 'medium',

    // Notificaciones
    emailUpdates: false,
    smsUpdates: false,
    notifications: false
  });

  const totalSteps = 4;

  // Detectar zona horaria automáticamente
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setFormData(prev => ({ ...prev, timezone }));
  }, []);

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

      // Estructurar datos correctamente
      const userPayload = {
        // Información personal
        gender: formData.gender,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth) : null,
        phone: formData.phone || 'none',
        location: formData.location || 'none',

        // Preferencias regionales
        language: formData.language,
        timezone: formData.timezone,

        // Preferencias de interfaz
        theme: formData.theme,
        privacyLevel: formData.privacyLevel,

        // Preferencias de notificaciones (estructuradas correctamente)
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

      // Navegar a la evaluación emocional después de completar el perfil
      console.log('🔄 Navegando a /evaluacion-emocional después de completar perfil');
      navigate('/evaluacion-emocional');
    } catch (error) {
      console.error('❌ Error al completar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Información Personal</h3>
        <p className="text-sm text-gray-600 mb-6">Completa tu información básica para personalizar tu experiencia.</p>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Teléfono
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ubicación
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleInputChange('location', e.target.value)}
            placeholder="Ciudad, País"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 placeholder-gray-400"
          />
        </div>
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
            {/* América del Norte */}
            <optgroup label="América del Norte">
              <option value="America/New_York">Nueva York (GMT-5/-4)</option>
              <option value="America/Chicago">Chicago (GMT-6/-5)</option>
              <option value="America/Denver">Denver (GMT-7/-6)</option>
              <option value="America/Los_Angeles">Los Ángeles (GMT-8/-7)</option>
              <option value="America/Anchorage">Alaska (GMT-9/-8)</option>
              <option value="Pacific/Honolulu">Hawaii (GMT-10)</option>
              <option value="America/Toronto">Toronto (GMT-5/-4)</option>
              <option value="America/Vancouver">Vancouver (GMT-8/-7)</option>
            </optgroup>

            {/* América Central y México */}
            <optgroup label="América Central y México">
              <option value="America/Mexico_City">Ciudad de México (GMT-6/-5)</option>
              <option value="America/Cancun">Cancún (GMT-5)</option>
              <option value="America/Guatemala">Guatemala (GMT-6)</option>
              <option value="America/Tegucigalpa">Tegucigalpa (GMT-6)</option>
              <option value="America/Managua">Managua (GMT-6)</option>
              <option value="America/San_Jose">San José (GMT-6)</option>
              <option value="America/Panama">Panamá (GMT-5)</option>
            </optgroup>

            {/* América del Sur */}
            <optgroup label="América del Sur">
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Lima">Lima (GMT-5)</option>
              <option value="America/Caracas">Caracas (GMT-4)</option>
              <option value="America/La_Paz">La Paz (GMT-4)</option>
              <option value="America/Santiago">Santiago (GMT-3/-4)</option>
              <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="America/Montevideo">Montevideo (GMT-3)</option>
              <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
              <option value="America/Recife">Recife (GMT-3)</option>
              <option value="America/Manaus">Manaus (GMT-4)</option>
              <option value="America/Rio_Branco">Rio Branco (GMT-5)</option>
            </optgroup>

            {/* Europa */}
            <optgroup label="Europa">
              <option value="Europe/London">Londres (GMT+0/+1)</option>
              <option value="Europe/Paris">París (GMT+1/+2)</option>
              <option value="Europe/Madrid">Madrid (GMT+1/+2)</option>
              <option value="Europe/Rome">Roma (GMT+1/+2)</option>
              <option value="Europe/Berlin">Berlín (GMT+1/+2)</option>
              <option value="Europe/Amsterdam">Ámsterdam (GMT+1/+2)</option>
              <option value="Europe/Brussels">Bruselas (GMT+1/+2)</option>
              <option value="Europe/Vienna">Viena (GMT+1/+2)</option>
              <option value="Europe/Zurich">Zúrich (GMT+1/+2)</option>
              <option value="Europe/Stockholm">Estocolmo (GMT+1/+2)</option>
              <option value="Europe/Oslo">Oslo (GMT+1/+2)</option>
              <option value="Europe/Copenhagen">Copenhague (GMT+1/+2)</option>
              <option value="Europe/Helsinki">Helsinki (GMT+2/+3)</option>
              <option value="Europe/Warsaw">Varsovia (GMT+1/+2)</option>
              <option value="Europe/Prague">Praga (GMT+1/+2)</option>
              <option value="Europe/Budapest">Budapest (GMT+1/+2)</option>
              <option value="Europe/Bucharest">Bucarest (GMT+2/+3)</option>
              <option value="Europe/Sofia">Sofía (GMT+2/+3)</option>
              <option value="Europe/Athens">Atenas (GMT+2/+3)</option>
              <option value="Europe/Istanbul">Estambul (GMT+3)</option>
              <option value="Europe/Moscow">Moscú (GMT+3)</option>
            </optgroup>

            {/* Asia */}
            <optgroup label="Asia">
              <option value="Asia/Dubai">Dubái (GMT+4)</option>
              <option value="Asia/Karachi">Karachi (GMT+5)</option>
              <option value="Asia/Kolkata">Kolkata (GMT+5:30)</option>
              <option value="Asia/Dhaka">Dacca (GMT+6)</option>
              <option value="Asia/Bangkok">Bangkok (GMT+7)</option>
              <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
              <option value="Asia/Manila">Manila (GMT+8)</option>
              <option value="Asia/Shanghai">Shanghái (GMT+8)</option>
              <option value="Asia/Hong_Kong">Hong Kong (GMT+8)</option>
              <option value="Asia/Singapore">Singapur (GMT+8)</option>
              <option value="Asia/Tokyo">Tokio (GMT+9)</option>
              <option value="Asia/Seoul">Seúl (GMT+9)</option>
              <option value="Asia/Sydney">Sídney (GMT+10/+11)</option>
              <option value="Asia/Melbourne">Melbourne (GMT+10/+11)</option>
            </optgroup>

            {/* África */}
            <optgroup label="África">
              <option value="Africa/Cairo">El Cairo (GMT+2)</option>
              <option value="Africa/Johannesburg">Johannesburgo (GMT+2)</option>
              <option value="Africa/Lagos">Lagos (GMT+1)</option>
              <option value="Africa/Casablanca">Casablanca (GMT+1)</option>
              <option value="Africa/Nairobi">Nairobi (GMT+3)</option>
              <option value="Africa/Addis_Ababa">Addis Abeba (GMT+3)</option>
            </optgroup>

            {/* Oceanía */}
            <optgroup label="Oceanía">
              <option value="Pacific/Auckland">Auckland (GMT+12/+13)</option>
              <option value="Pacific/Fiji">Fiyi (GMT+12)</option>
              <option value="Pacific/Tahiti">Tahití (GMT-10)</option>
              <option value="Pacific/Guam">Guam (GMT+10)</option>
            </optgroup>
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
            Tema de la Aplicación *
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.theme === 'light'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => handleInputChange('theme', 'light')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-300"></div>
                <div>
                  <div className="font-medium text-gray-900">Claro</div>
                  <div className="text-sm text-gray-500">Fondo blanco, texto oscuro</div>
                </div>
              </div>
            </div>

            <div
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${formData.theme === 'dark'
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-gray-300'
                }`}
              onClick={() => handleInputChange('theme', 'dark')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 rounded-full bg-gray-800 border-2 border-gray-300"></div>
                <div>
                  <div className="font-medium text-gray-900">Oscuro</div>
                  <div className="text-sm text-gray-500">Fondo oscuro, texto claro</div>
                </div>
              </div>
            </div>
          </div>
        </div>

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
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${currentStep === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                }`}
            >
              Anterior
            </button>

            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
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
                  {loading ? 'Completando...' : 'Completar Perfil'}
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
