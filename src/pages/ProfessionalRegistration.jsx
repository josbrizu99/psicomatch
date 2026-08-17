import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendProfessionalAccessCode } from '../services/emailService';
import ImageUploader from '../components/common/ImageUploader';
import { uploadProfessionalProfilePhoto } from '../services/storageService';
import { logUserAction } from '../services/authService';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const ProfessionalRegistration = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    professionalCode: '',
    specialities: [],
    experienceYears: '',
    phone: '',
    bio: '',
    // Campos de contacto adicionales
    whatsapp: '',
    instagram: '',
    linkedin: '',
    country: '',
    city: '',
    // Campos de disponibilidad
    timezone: 'America/Asuncion',
    sessionDuration: 60,
    breakBetweenSessions: 10,
    maxSessionsPerDay: 10,
    inPerson: true,
    online: false,
    hybrid: false,
    // Campos de notificaciones
    emailNotifications: true,
    smsNotifications: false,
    appNotifications: true,
    appointmentReminders: true,
    sessionReminders: true,
    // Campos de preferencias de citas
    advanceBookingDays: 7,
    cancellationPolicy: '24 horas antes',
    reschedulingPolicy: '2 horas antes',
    paymentMethods: ['efectivo', 'transferencia', 'tarjeta']
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const totalSteps = 5;

  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Especialidades disponibles
  const availableSpecialities = [
    'Ansiedad (Cognitivo-Conductual)',
    'Depresión (Cognitivo-Conductual)',
    'Estrés (Mindfulness)',
    'Trauma (EMDR)',
    'Pareja (Sistémica)',
    'Familiar (Sistémica)',
    'Infantil (Lúdica)',
    'Adolescentes (Cognitivo-Conductual)',
    'Adultos (Humanista)',
    'TOC (Cognitivo-Conductual)',
    'Fobias (Exposición)',
    'Duelo (Humanista)',
    'Adicciones (Cognitivo-Conductual)',
    'Autoestima (Humanista)',
    'Desarrollo personal (Humanista)',
    'Crisis existencial (Humanista)',
    'Problemas laborales (Cognitivo-Conductual)',
    'Problemas académicos (Cognitivo-Conductual)',
    'Trastornos alimentarios (Cognitivo-Conductual)',
    'Trastornos del sueño (Cognitivo-Conductual)',
    'Neuropsicología (Evaluación)',
    'Psicología Forense (Evaluación)',
    'Otra'
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSpecialityChange = (speciality) => {
    setFormData(prev => ({
      ...prev,
      specialities: prev.specialities.includes(speciality)
        ? prev.specialities.filter(s => s !== speciality)
        : [...prev.specialities, speciality]
    }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      setError('El nombre es requerido');
      return false;
    }
    if (!formData.email.trim()) {
      setError('El email es requerido');
      return false;
    }
    if (!formData.password) {
      setError('La contraseña es requerida');
      return false;
    }
    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.professionalCode.trim()) {
      setError('El número de registro profesional es requerido');
      return false;
    }
    if (!formData.specialities.length) {
      setError('Debe seleccionar al menos una especialidad');
      return false;
    }
    if (!formData.experienceYears) {
      setError('Los años de experiencia son requeridos');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!formData.phone.trim()) {
      setError('El número de teléfono es requerido');
      return false;
    }
    if (!formData.country) {
      setError('El país es requerido');
      return false;
    }
    if (!formData.city) {
      setError('La ciudad es requerida');
      return false;
    }
    if (!formData.bio.trim()) {
      setError('La biografía es requerida');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    // Validación para disponibilidad
    return true;
  };

  const validateStep5 = () => {
    // Validación para notificaciones y preferencias
    if (formData.paymentMethods.length === 0) {
      setError('Debe seleccionar al menos un método de pago');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    } else if (currentStep === 3 && validateStep3()) {
      setCurrentStep(4);
    } else if (currentStep === 4 && validateStep4()) {
      setCurrentStep(5);
    }
  };

  const handlePrevious = () => {
    setError('');
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    console.log('🔄 handleSubmit ejecutado', { currentStep, totalSteps, isSubmitted, loading });
    e.preventDefault();
    setError('');
    setMessage('');

    // Prevenir envíos múltiples
    if (isSubmitted || loading) {
      console.log('❌ Formulario ya enviado o cargando');
      return;
    }

    // Solo permitir envío en el último paso
    if (currentStep !== totalSteps) {
      setError('Por favor, completa todos los pasos antes de enviar el formulario.');
      return;
    }

    if (!validateStep5()) {
      return;
    }

    // Mostrar modal de confirmación
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmModal(false);
    setIsSubmitted(true);
    setLoading(true);

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Actualizar perfil del usuario
      await updateProfile(user, {
        displayName: formData.fullName
      });

      // Subir foto de perfil si fue seleccionada
      let photoURL = '';
      if (profilePhotoFile) {
        setIsUploadingPhoto(true);
        const uploadResult = await uploadProfessionalProfilePhoto(
          profilePhotoFile,
          user.uid,
          (progress) => setUploadProgress(progress)
        );
        setIsUploadingPhoto(false);
        if (uploadResult.success) {
          photoURL = uploadResult.url;
          // Actualizar foto en Firebase Auth también
          await updateProfile(user, { photoURL });
        } else {
          console.warn('⚠️ Error al subir foto de perfil:', uploadResult.error);
        }
      }

      // Registrar IP de registro
      await logUserAction(user.uid, 'register');

      // Preparar datos del profesional según la estructura actual
      const professionalData = {
        // Datos básicos
        fullName: formData.fullName,
        name: formData.fullName, // También guardar como 'name' para compatibilidad
        email: formData.email.toLowerCase(),
        professionalcode: formData.professionalCode, // Nota: en minúsculas como en la estructura
        specialities: formData.specialities,
        exprecienceYears: formData.experienceYears, // Nota: manteniendo el typo de la estructura actual
        phone: formData.phone,
        country: formData.country,
        city: formData.city,
        location: `${formData.city}, ${formData.country}`,
        bio: formData.bio,
        photoURL,

        // Campos de autenticación (código se generará en verificación)
        accessCode: null,
        accessCodeGeneratedAt: null,
        password: formData.password, // Se guarda temporalmente para referencia
        emailVerified: false,
        lastLoginAt: null,
        loginAttempts: 0,
        lockedUntil: null,

        // Estado inicial - pendiente de verificación
        status: 'pending',
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,

        // Campos de actividad
        totalSessions: 0,
        totalPatients: 0,
        lastActivityAt: null,

        // Campos de auditoría
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.uid,
        updatedBy: user.uid,

        // Campos de calificación
        rating: 0,
        ratingCount: 0,

        // Configuraciones según los datos del formulario
        availability: {
          isAvailable: true,
          timezone: formData.timezone,
          sessionSettings: formData.sessionDuration.toString(),
          modalities: {
            inPerson: formData.inPerson,
            online: formData.online,
            hybrid: formData.hybrid
          }
        },
        notifications: {
          emailNotifications: formData.emailNotifications,
          smsNotifications: formData.smsNotifications,
          appNotifications: formData.appNotifications,
          appointmentReminders: formData.appointmentReminders,
          sessionReminders: formData.sessionReminders
        },
        appointmentPreferences: {
          advanceBookingDays: formData.advanceBookingDays.toString(),
          cancellationPolicy: formData.cancellationPolicy,
          reschedulingPolicy: formData.reschedulingPolicy,
          paymentMethods: formData.paymentMethods
        },

        // Contacto completo
        contact: {
          email: formData.email.toLowerCase(),
          phone: formData.phone,
          whatsapp: formData.whatsapp,
          instagram: formData.instagram,
          linkedin: formData.linkedin
        }
      };

      // Guardar datos en Firestore
      await setDoc(doc(db, 'professionals', user.uid), professionalData);

      setMessage('¡Registro completado exitosamente! Tu información ha sido enviada para revisión. Recibirás una notificación cuando tu cuenta sea verificada.');

      // Cerrar sesión del profesional recién registrado
      await auth.signOut();

      // Redirigir a la página inicial
      setTimeout(() => {
        navigate('/');
      }, 5000);

    } catch (error) {
      console.error('Error al registrar profesional:', error);
      let errorMessage = 'Error al crear la cuenta';

      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña debe tener al menos 6 caracteres';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Registro no está habilitado';
          break;
        default:
          errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Información Personal</h3>
        <p className="text-sm text-gray-500">Datos básicos para tu cuenta</p>
      </div>

      <div className="text-left">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Foto de Perfil</label>
        <ImageUploader
          onFileSelected={setProfilePhotoFile}
          currentPhotoURL={''}
          uploadProgress={uploadProgress}
          isUploading={isUploadingPhoto}
          label="Sube tu foto"
          hint="Recomendamos una foto profesional de frente y con buena iluminación."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre Completo *</label>
        <input
          type="text"
          name="fullName"
          value={formData.fullName}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="Tu nombre completo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="tu@email.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña *</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-4 py-3 pr-10 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
            placeholder="Mínimo 6 caracteres"
          />
          <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Contraseña *</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-3 pr-10 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
            placeholder="Repite tu contraseña"
          />
          <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
            {showConfirmPassword ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Información Profesional</h3>
        <p className="text-sm text-gray-500">Datos de tu ejercicio profesional</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Número de Registro Profesional *</label>
        <input
          type="text"
          name="professionalCode"
          value={formData.professionalCode}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="Ej: PSI-12345"
        />
        <p className="mt-1 text-sm text-gray-500">Este número será verificado por el administrador</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Especialidades *</label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {availableSpecialities.map((speciality) => (
            <label key={speciality} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.specialities.includes(speciality)}
                onChange={() => handleSpecialityChange(speciality)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">{speciality}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Años de Experiencia *</label>
        <select
          name="experienceYears"
          value={formData.experienceYears}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
        >
          <option value="">Seleccionar</option>
          <option value="0">Recién graduado</option>
          <option value="1">1 año</option>
          <option value="2">2 años</option>
          <option value="3">3 años</option>
          <option value="4">4 años</option>
          <option value="5">5 años</option>
          <option value="6-10">6-10 años</option>
          <option value="11-15">11-15 años</option>
          <option value="16-20">16-20 años</option>
          <option value="20+">Más de 20 años</option>
        </select>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Información de Contacto y Ubicación</h3>
        <p className="text-sm text-gray-500">Datos para que los pacientes te contacten y encuentren</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">País *</label>
          <select
            name="country"
            value={formData.country}
            onChange={(e) => {
              handleInputChange(e);
              // Resetear ciudad al cambiar de país
              setFormData(prev => ({ ...prev, city: '' }));
            }}
            className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
            required
          >
            <option value="">Selecciona tu país</option>
            <option value="Paraguay">Paraguay</option>
            <option value="Argentina">Argentina</option>
            <option value="Brasil">Brasil</option>
            <option value="España">España</option>
            <option value="Estados Unidos">Estados Unidos</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Ciudad *</label>
          <select
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Teléfono *</label>
        <div className="phone-input-wrapper bg-white/60 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-transparent transition-all shadow-sm">
          <PhoneInput
            international
            defaultCountry="PY"
            value={formData.phone}
            onChange={(val) => setFormData(prev => ({ ...prev, phone: val || '' }))}
            className="w-full px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
        <div className="phone-input-wrapper bg-white/60 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-400 focus-within:border-transparent transition-all shadow-sm">
          <PhoneInput
            international
            defaultCountry="PY"
            value={formData.whatsapp}
            onChange={(val) => setFormData(prev => ({ ...prev, whatsapp: val || '' }))}
            className="w-full px-4 py-3 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
        <input
          type="text"
          name="instagram"
          value={formData.instagram}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="@tu_usuario"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn</label>
        <input
          type="url"
          name="linkedin"
          value={formData.linkedin}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="https://linkedin.com/in/tu-perfil"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Biografía Profesional *</label>
        <textarea
          name="bio"
          value={formData.bio}
          onChange={handleInputChange}
          rows={4}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
          placeholder="Cuéntanos sobre tu experiencia, enfoque terapéutico y especialidades..."
        />
        <p className="mt-1 text-sm text-gray-500">Esta información será visible para los pacientes</p>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Disponibilidad y Modalidades</h3>
        <p className="text-sm text-gray-500">Configura tu disponibilidad y modalidades de atención</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona Horaria</label>
        <select
          name="timezone"
          value={formData.timezone}
          onChange={handleInputChange}
          className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
        >
          <option value="America/Asuncion">Asunción (UTC-3)</option>
          <option value="America/Argentina/Buenos_Aires">Buenos Aires (UTC-3)</option>
          <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
          <option value="America/New_York">Nueva York (UTC-5)</option>
          <option value="Europe/Madrid">Madrid (UTC+1)</option>
        </select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Duración de Sesión (min)</label>
          <input
            type="number"
            name="sessionDuration"
            value={formData.sessionDuration}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
            min="30"
            max="180"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descanso entre Sesiones (min)</label>
          <input
            type="number"
            name="breakBetweenSessions"
            value={formData.breakBetweenSessions}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
            min="5"
            max="60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Máx. Sesiones por Día</label>
          <input
            type="number"
            name="maxSessionsPerDay"
            value={formData.maxSessionsPerDay}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
            min="1"
            max="20"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Modalidades de Atención</label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.inPerson}
              onChange={(e) => setFormData(prev => ({ ...prev, inPerson: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Presencial</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.online}
              onChange={(e) => setFormData(prev => ({ ...prev, online: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Online</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.hybrid}
              onChange={(e) => setFormData(prev => ({ ...prev, hybrid: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Híbrido</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Notificaciones y Preferencias</h3>
        <p className="text-sm text-gray-500">Configura tus preferencias de notificaciones y citas</p>
        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Último paso:</strong> Una vez que completes este formulario, tu información será enviada para revisión.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Notificaciones</label>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.emailNotifications}
              onChange={(e) => setFormData(prev => ({ ...prev, emailNotifications: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Notificaciones por Email</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.smsNotifications}
              onChange={(e) => setFormData(prev => ({ ...prev, smsNotifications: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Notificaciones por SMS</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.appNotifications}
              onChange={(e) => setFormData(prev => ({ ...prev, appNotifications: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Notificaciones de la App</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.appointmentReminders}
              onChange={(e) => setFormData(prev => ({ ...prev, appointmentReminders: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Recordatorios de Citas</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.sessionReminders}
              onChange={(e) => setFormData(prev => ({ ...prev, sessionReminders: e.target.checked }))}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Recordatorios de Sesiones</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Días de Anticipación para Citas</label>
          <input
            type="number"
            name="advanceBookingDays"
            value={formData.advanceBookingDays}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900 placeholder-gray-400"
            min="1"
            max="30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Política de Cancelación</label>
          <select
            name="cancellationPolicy"
            value={formData.cancellationPolicy}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
          >
            <option value="24 horas antes">24 horas antes</option>
            <option value="48 horas antes">48 horas antes</option>
            <option value="72 horas antes">72 horas antes</option>
            <option value="1 semana antes">1 semana antes</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Política de Reprogramación</label>
        <select
          name="reschedulingPolicy"
          value={formData.reschedulingPolicy}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-gray-900"
        >
          <option value="2 horas antes">2 horas antes</option>
          <option value="4 horas antes">4 horas antes</option>
          <option value="24 horas antes">24 horas antes</option>
          <option value="48 horas antes">48 horas antes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Métodos de Pago Aceptados</label>
        <div className="space-y-2">
          {[
            { value: 'efectivo', label: 'Efectivo' },
            { value: 'transferencia', label: 'Transferencia Bancaria' },
            { value: 'tarjeta', label: 'Tarjeta de Crédito/Débito' },
            { value: 'paypal', label: 'PayPal' }
          ].map((method) => (
            <label key={method.value} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.paymentMethods.includes(method.value)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({ ...prev, paymentMethods: [...prev.paymentMethods, method.value] }));
                  } else {
                    setFormData(prev => ({ ...prev, paymentMethods: prev.paymentMethods.filter(m => m !== method.value) }));
                  }
                }}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">{method.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Registro de Profesional
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Únete a nuestra plataforma como profesional de la salud mental
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${step <= currentStep
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                    }`}>
                    {step}
                  </div>
                  {step < totalSteps && (
                    <div className={`w-16 h-1 mx-2 ${step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                      }`} />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-600 text-center">
              Paso {currentStep} de {totalSteps}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
              {message}
            </div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            // No hacer nada automáticamente
          }} onKeyDown={(e) => {
            if (e.key === 'Enter' && currentStep < totalSteps) {
              e.preventDefault();
              handleNext();
            } else if (e.key === 'Enter' && currentStep === totalSteps) {
              e.preventDefault();
              // No hacer nada automáticamente en el último paso
            }
          }}>
            {/* Step Content */}
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
            {currentStep === 5 && renderStep5()}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentStep === 1}
                className={`px-4 py-2 text-sm font-medium rounded-md ${currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
              >
                Anterior
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || isSubmitted}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {loading ? 'Registrando...' : isSubmitted ? 'Registro Enviado' : 'Completar Registro'}
                </button>
              )}
            </div>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/professional-login" className="font-medium text-indigo-600 hover:text-indigo-500">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-xl p-5 shadow-xl w-full max-w-sm">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirmar Registro</h3>
              <div className="mt-4 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  ¿Estás seguro de que todos los datos que proporcionas son correctos?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  El administrador verificará tu perfil para su posterior verificación y te dará un código de acceso una vez aprobado tu perfil.
                </p>
                <p className="text-sm text-gray-500">
                  ¿Deseas continuar con el registro?
                </p>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={handleConfirmSubmit}
                  className="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  Aceptar
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalRegistration;
