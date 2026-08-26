import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase';
import { isValidAccessCode } from '../../services/professionalAccessCodeService';
import { sendProfessionalLoginNotification } from '../../services/emailService';
import ForgotPasswordModal from '../common/ForgotPasswordModal';
import { isProfessional2FAEnabled } from '../../services/twoFactorService';
import TwoFactorModal from '../common/TwoFactorModal';

const ProfessionalLoginTwoStep = () => {
  const [step, setStep] = useState(1); // 1: Email/Password, 2: Access Code
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    accessCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [professionalData, setProfessionalData] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [show2FA, setShow2FA] = useState(false);
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar errores cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleStepOne = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 1. Autenticar con Firebase Auth
      console.log('Autenticando credenciales en Firebase Auth...');
      const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // 2. Obtener datos del profesional ya autenticado
      let professionalDoc = await getDoc(doc(db, 'professionals', user.uid));

      if (!professionalDoc.exists()) {
        // Fallback por email por si los IDs no coinciden
        const professionalsRef = collection(db, 'professionals');
        const q = query(professionalsRef, where('email', '==', formData.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          professionalDoc = querySnapshot.docs[0];
        }
      }

      if (!professionalDoc || !professionalDoc.exists()) {
        await auth.signOut();
        setError('No se encontró un profesional con ese email');
        return;
      }

      const data = professionalDoc.data();
      const professionalId = professionalDoc.id;

      console.log('Verificando datos del profesional:', {
        email: data.email,
        status: data.status,
        isVerified: data.isVerified
      });

      // Verificar si el profesional está activo
      if (data.status !== 'active') {
        await auth.signOut();
        setError('Tu cuenta está inactiva. Contacta al administrador para activar tu cuenta.');
        return;
      }

      // Verificar si está verificado
      if (!data.isVerified) {
        await auth.signOut();
        setError('Tu cuenta aún no ha sido verificada por el administrador.');
        return;
      }

      // Verificar si está bloqueado
      if (data.lockedUntil && new Date() < data.lockedUntil.toDate()) {
        await auth.signOut();
        setError('Tu cuenta está temporalmente bloqueada. Intenta más tarde.');
        return;
      }

      // Guardar datos del profesional para el siguiente paso
      setProfessionalData({ ...data, id: professionalId, uid: user.uid });

      const twoFAEnabled = await isProfessional2FAEnabled(user.uid);

      if (twoFAEnabled) {
        setShow2FA(true);
        setSuccess('Credenciales verificadas. Completá la verificación de dos factores enviada a tu correo.');
      } else {
        setStep(2);
        setSuccess('Credenciales verificadas. Ahora ingresa tu código de acceso.');
      }

    } catch (error) {
      console.error('Error en paso 1:', error);

      let errorMessage = 'Error al iniciar sesión';

      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No se encontró un profesional con ese email';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta cuenta está deshabilitada';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet';
          break;
        default:
          errorMessage = `Error: ${error.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleStepTwo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Recuperar datos actualizados del profesional
      const profDoc = await getDoc(doc(db, 'professionals', professionalData.id));
      const data = profDoc.exists() ? profDoc.data() : professionalData;

      const storedCode = (data.accessCode || '').toString().trim();
      const typedCode = (formData.accessCode || '').toString().trim();

      // Verificar código de acceso
      if (storedCode !== typedCode) {
        setError('Código de acceso incorrecto');
        await auth.signOut();
        return;
      }

      // Verificar si el código de acceso es válido (no está desactivado)
      if (!isValidAccessCode(storedCode)) {
        setError('Tu código de acceso ha sido desactivado. Contacta al administrador.');
        await auth.signOut();
        return;
      }

      // Actualizar último login, incrementar sesiones y limpiar intentos fallidos
      const newTotalSessions = (professionalData.totalSessions || 0) + 1;
      console.log('Actualizando sesiones:', {
        currentSessions: professionalData.totalSessions || 0,
        newSessions: newTotalSessions
      });

      await updateDoc(doc(db, 'professionals', professionalData.id), {
        lastLoginAt: serverTimestamp(),
        totalSessions: newTotalSessions,
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: serverTimestamp()
      });

      console.log('Profesional logueado exitosamente, sesiones actualizadas:', newTotalSessions);
      await sendProfessionalLoginNotification({
        email: data.email,
        name: data.name,
        accessCode: storedCode,
        loginTime: new Date().toISOString()
      });
      setSuccess('¡Inicio de sesión exitoso! Redirigiendo al panel...');

      // Redirección automática
      setTimeout(() => {
        navigate('/professional-dashboard');
      }, 1500);

    } catch (error) {
      console.error('Error en paso 2:', error);
      setError(`Error al verificar código de acceso: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const goBackToStepOne = () => {
    setStep(1);
    setError('');
    setSuccess('');
    setProfessionalData(null);
    // Cerrar sesión si se autenticó en el paso 1
    if (auth.currentUser) {
      auth.signOut();
    }
  };

  const handle2FAVerified = () => {
    setShow2FA(false);
    sessionStorage.setItem(`2fa_verified_${auth.currentUser?.uid}`, 'true');
    setStep(2); // Go to Access Code step
    setSuccess('Verificación de dos factores exitosa. Ahora ingresa tu código de acceso.');
  };

  const handle2FACancel = async () => {
    setShow2FA(false);
    setSuccess('');
    setError('Sesión cancelada. Se requiere verificación de dos factores.');
    setProfessionalData(null);
    if (auth.currentUser) {
      await auth.signOut();
    }
  };

  return (
    <>
      <ForgotPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        defaultEmail={formData.email}
      />
      <TwoFactorModal
        isOpen={show2FA}
        uid={auth.currentUser?.uid || professionalData?.id}
        email={auth.currentUser?.email || professionalData?.email}
        onVerified={handle2FAVerified}
        onCancel={handle2FACancel}
      />
      <div className="min-h-screen bg-gradient-to-br from-surface-off via-primary-50 to-secondary-50 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 sm:w-96 sm:h-96 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 sm:w-96 sm:h-96 bg-secondary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-float-slow" style={{ animationDelay: '2s' }} />

      <div className="max-w-md w-full space-y-6 relative z-10 animate-fade-in">
        {/* Header */}
        <div className="animate-fade-in-up text-center">
          <Link to="/" className="flex justify-center mb-4">
            <span className="text-3xl sm:text-4xl font-extrabold text-primary-600 tracking-tight">Psicomatch</span>
          </Link>
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-primary-100 rounded-full px-4 py-1.5 shadow-sm mb-3">
            <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-semibold text-primary-700 uppercase tracking-wide">Acceso Profesional</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {step === 1 ? 'Inicia sesión' : 'Código de acceso'}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {step === 1 ? 'Ingresa tus credenciales profesionales' : 'Introduce el código de 5 dígitos asignado por el administrador'}
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-3">
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">1</span>
            Credenciales
          </div>
          <div className={`h-0.5 w-8 rounded transition-all ${step >= 2 ? 'bg-primary-500' : 'bg-gray-300'}`} />
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
            <span className="w-4 h-4 rounded-full bg-white/30 flex items-center justify-center text-[10px] font-bold">2</span>
            Código
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {step === 1 ? (
            <form className="space-y-5" onSubmit={handleStepOne}>
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico profesional
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
                  placeholder="tu@email.com"
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-10 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
                    placeholder="Tu contraseña"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
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

              {/* Forgot password */}
              <div className="flex items-center justify-end">
                <button 
                  type="button" 
                  className="text-sm font-medium text-primary-600 hover:text-primary-500" 
                  disabled={loading}
                  onClick={() => setShowResetModal(true)}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 disabled:bg-primary-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verificando...
                  </span>
                ) : 'Continuar'}
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handleStepTwo}>
              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Success */}
              {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Professional info pill */}
              {professionalData && (
                <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">{professionalData?.name}</p>
                    <p className="text-xs text-primary-600 truncate">{professionalData?.email}</p>
                  </div>
                </div>
              )}

              {/* Access code input */}
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Código de acceso
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  type="text"
                  maxLength="5"
                  required
                  value={formData.accessCode}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm text-center font-mono tracking-[0.4em] text-lg"
                  placeholder="·····"
                  disabled={loading}
                />
                <p className="mt-1.5 text-xs text-gray-500">Código de 5 dígitos proporcionado por el administrador</p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBackToStepOne}
                  disabled={loading}
                  className="flex-1 py-3.5 px-4 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 bg-white/60 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center py-3.5 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 disabled:bg-primary-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : 'Iniciar Sesión'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-between text-sm">
          <Link to="/" className="text-gray-500 hover:text-primary-600 transition-colors">
            ← Volver al inicio
          </Link>
          <Link to="/professional-registration" className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
            Registrarse como Profesional
          </Link>
        </div>
      </div>
    </div>
    </>
  );
};

export default ProfessionalLoginTwoStep;
