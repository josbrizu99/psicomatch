import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { registerUser, loginWithGoogle, handleGoogleRedirect } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { functions } from '../firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import TermsModal from '../components/common/TermsModal';

const CrearCuenta = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  // States for Email Verification
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Manejar redirección de Google al cargar la página
  useEffect(() => {
    const handleGoogleAuth = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result.success) {
          console.log('✅ Google Sign-In exitoso via redirección en CrearCuenta');
        }
      } catch (error) {
        console.error('❌ Error al manejar redirección de Google:', error);
      }
    };
    handleGoogleAuth();
  }, []);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (currentUser) {
      console.log('✅ Usuario autenticado en CrearCuenta, permitiendo que ProfileWizard se muestre si es necesario');
    }
  }, [currentUser, navigate]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!formData.email) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }

    if (!formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Debe contener mayúscula, minúscula y número';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirmá tu contraseña';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    if (!termsAccepted) {
      newErrors.terms = 'Debés aceptar los términos y condiciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    if (generalError) setGeneralError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setGeneralError('');

    try {
      // 1. Verificar si el email ya existe en Firebase Auth
      const checkEmailExists = httpsCallable(functions, 'checkEmailExists');
      const { data: existsData } = await checkEmailExists({ email: formData.email });
      
      if (existsData.exists) {
        setGeneralError('El correo electrónico ya está registrado.');
        setLoading(false);
        return;
      }

      // 2. Generar y enviar código de verificación
      const generateCode = httpsCallable(functions, 'generateRegistrationCode');
      await generateCode({ email: formData.email });
      
      // Mostrar modal para ingresar el código
      setShowVerificationModal(true);
    } catch (error) {
      console.error(error);
      if (error.code === 'functions/resource-exhausted') {
         setGeneralError('Por favor, esperá un momento antes de pedir otro código.');
      } else {
         setGeneralError('Error enviando el código de verificación. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Ingresá el código de 6 dígitos.');
      return;
    }
    
    setVerifying(true);
    setVerificationError('');
    
    try {
      // 1. Verificar el código
      const verifyCode = httpsCallable(functions, 'verifyRegistrationCode');
      const { data } = await verifyCode({ email: formData.email, code: verificationCode });
      
      if (data.success) {
        // 2. Crear cuenta de Firebase
        const result = await registerUser(formData.name, formData.email, formData.password, '');
        if (!result.success) {
           setVerificationError(result.error);
        } else {
           setShowVerificationModal(false);
           // registerUser will handle redirection or AuthContext will catch it
        }
      } else {
        setVerificationError(`Código incorrecto. Intentos restantes: ${data.attemptsLeft}`);
      }
    } catch (error) {
      console.error(error);
      setVerificationError(error.message || 'Error verificando el código.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGoogleSignUp = async () => {
    if (!termsAccepted) {
      setErrors(prev => ({ ...prev, terms: 'Debés aceptar los términos antes de continuar con Google' }));
      return;
    }
    setGoogleLoading(true);
    setGeneralError('');

    try {
      const result = await loginWithGoogle();
      if (result.redirect) return;
      if (!result.success) setGeneralError(result.error);
    } catch (error) {
      setGeneralError('Error inesperado al registrarse con Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Si ya está autenticado, mostrar loading
  if (currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-xl bg-gray-50/50 hover:bg-white focus:bg-white transition-colors focus:outline-none focus:ring-2 text-sm text-gray-900 placeholder-gray-400 ${
      errors[field]
        ? 'border-red-300 focus:ring-red-400'
        : 'border-gray-200 focus:ring-primary-400'
    }`;

  return (
    <>
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setTermsAccepted(true)}
      />

      <div className="min-h-screen bg-surface-off flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 animate-fade-in-up">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary-50 rounded-2xl flex items-center justify-center shadow-sm mb-4">
              <svg className="h-6 w-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Crear tu cuenta</h2>
            <p className="mt-2 text-sm text-gray-600">
              ¿Ya tenés una cuenta?{' '}
              <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                Inicia sesión aquí
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl shadow-soft p-6 sm:p-8 border border-gray-100">
              <div className="space-y-5">
                {/* Error general */}
                {generalError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-800">{generalError}</p>
                  </div>
                )}

                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                  <input
                    id="name" name="name" type="text" autoComplete="name" required
                    value={formData.name} onChange={handleChange}
                    className={inputClass('name')}
                    placeholder="Tu nombre completo"
                    disabled={loading || googleLoading}
                  />
                  {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Correo electrónico</label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={formData.email} onChange={handleChange}
                    className={inputClass('email')}
                    placeholder="tu@email.com"
                    disabled={loading || googleLoading}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Phone removed to avoid duplication */}

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <input
                      id="password" name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password" required
                      value={formData.password} onChange={handleChange}
                      className={inputClass('password') + ' pr-10'}
                      placeholder="Crea una contraseña segura"
                      disabled={loading || googleLoading}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                      onClick={() => setShowPassword(!showPassword)}>
                      {showPassword
                        ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {errors.password
                    ? <p className="mt-1 text-xs text-red-600">{errors.password}</p>
                    : <p className="mt-1 text-xs text-gray-400">Mínimo 6 caracteres con mayúscula, minúscula y número</p>}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar contraseña</label>
                  <div className="relative">
                    <input
                      id="confirmPassword" name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password" required
                      value={formData.confirmPassword} onChange={handleChange}
                      className={inputClass('confirmPassword') + ' pr-10'}
                      placeholder="Confirmá tu contraseña"
                      disabled={loading || googleLoading}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword
                        ? <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        : <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
                </div>

                {/* Términos y Condiciones */}
                <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${errors.terms ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
                  <input
                    id="terms" type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => {
                      setTermsAccepted(e.target.checked);
                      if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
                    }}
                    className="h-4 w-4 mt-0.5 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer flex-shrink-0"
                    disabled={loading || googleLoading}
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
                    He leído y acepto las{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="text-primary-600 hover:text-primary-700 font-medium underline underline-offset-2"
                    >
                      bases y condiciones de la plataforma
                    </button>
                  </label>
                </div>
                {errors.terms && <p className="text-xs text-red-600 -mt-3">{errors.terms}</p>}

                {/* Submit */}
                <button
                  type="submit" disabled={loading || googleLoading}
                  className="w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:bg-primary-400 disabled:cursor-not-allowed shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creando cuenta...
                    </span>
                  ) : 'Crear Cuenta'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">O continúa con</span></div>
                </div>

                {/* Google */}
                <button
                  type="button" onClick={handleGoogleSignUp} disabled={loading || googleLoading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {googleLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Conectando con Google...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Continuar con Google
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTermsModal(false);
          if (errors.terms) {
            setErrors({ ...errors, terms: null });
          }
        }}
      />
      
      {/* Verification Code Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Verifica tu email</h3>
            <p className="text-sm text-gray-500 mb-6">
              Enviamos un código de 6 dígitos a <strong>{formData.email}</strong>. Ingresalo para completar tu registro.
            </p>
            
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {verificationError && (
                <div className="bg-red-50 text-red-700 text-sm p-3 rounded-lg border border-red-100">
                  {verificationError}
                </div>
              )}
              
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono"
                  placeholder="000000"
                  disabled={verifying}
                  required
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVerificationModal(false)}
                  disabled={verifying}
                  className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={verifying || verificationCode.length !== 6}
                  className="w-full px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-primary-400 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                >
                  {verifying ? 'Verificando...' : 'Confirmar y Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};


export default CrearCuenta;
