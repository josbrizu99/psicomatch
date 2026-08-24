import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, loginWithGoogle, handleGoogleRedirect } from '../services/authService';
import { useAuth } from '../contexts/AuthContext';
import { is2FAEnabled } from '../services/twoFactorService';
import TwoFactorModal from '../components/common/TwoFactorModal';
import ForgotPasswordModal from '../components/common/ForgotPasswordModal';
import { logoutUser } from '../services/authService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [loginInProgress, setLoginInProgress] = useState(false);
  const navigate = useNavigate();
  const { isUserAdmin, currentUser, userData, loading: authLoading } = useAuth();

  // Manejar redirección de Google al cargar la página
  useEffect(() => {
    const handleGoogleAuth = async () => {
      try {
        const result = await handleGoogleRedirect();
        if (result.success) {
          console.log('✅ Google Sign-In exitoso via redirección');
        }
      } catch (error) {
        console.error('❌ Error al manejar redirección de Google:', error);
      }
    };
    handleGoogleAuth();
  }, []);

  // Redirigir automáticamente si ya está autenticado (y 2FA resuelto)
  useEffect(() => {
    if (currentUser && !authLoading && !loading && !show2FA && !loginInProgress) {
      const check2FA = async () => {
        const twoFAEnabled = userData?.twoFactorEnabled || await is2FAEnabled(currentUser.uid);
        const isVerified = sessionStorage.getItem(`2fa_verified_${currentUser.uid}`) === 'true';

        if (twoFAEnabled && !isVerified) {
          setPendingUser(currentUser);
          setShow2FA(true);
          return;
        }

        // Si no requiere 2FA o ya lo verificó, procedemos a redirigir
        if (isUserAdmin) {
          navigate('/admin');
        } else {
          const isNewUser = userData?.loginCount === 1;
          const hasCompletedTests = userData?.testsCompleted > 0;
          const hasTestProgress = userData?.testProgress && userData.testProgress !== 'null';
          if (isNewUser && !hasCompletedTests && !hasTestProgress) {
            navigate('/evaluacion-emocional');
          } else {
            navigate('/dashboard');
          }
        }
      };
      
      check2FA();
    }
  }, [currentUser, isUserAdmin, loading, authLoading, navigate, userData, show2FA, loginInProgress]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginInProgress(true);
    setError('');

    try {
      // Verificar si el email pertenece a un profesional
      const professionalsRef = collection(db, 'professionals');
      const q = query(professionalsRef, where('email', '==', formData.email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError('Te registraste como profesional. Para acceder a tu cuenta ve al Acceso de Profesionales. Si deseas ingresar como usuario consultante, debes registrarte con otro correo.');
        setLoading(false);
        return;
      }

      const result = await loginUser(formData.email, formData.password);
      if (result.success) {
        // Verificar si el usuario tiene 2FA habilitado
        const twoFAEnabled = await is2FAEnabled(result.user.uid);
        if (twoFAEnabled) {
          setPendingUser(result.user);
          setShow2FA(true);
          // NO seteamos loginInProgress a false aquí, para que no redirija
        } else {
          // Si no tiene 2FA, puede redirigir
          setLoginInProgress(false);
        }
      } else {
        setError(result.error);
        setLoginInProgress(false);
      }
    } catch (error) {
      setError('Error inesperado. Intenta de nuevo.');
      console.error('Error en login:', error);
      setLoginInProgress(false);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginInProgress(true);
    setError('');
    try {
      // Nota: Con Google es más difícil verificar ANTES del login porque no sabemos el email
      // hasta que Google responde, pero el login de Google automáticamente los autentica en Firebase.
      // Para evitar que entren, lo controlaremos aquí después del login de Google.
      const result = await loginWithGoogle();
      if (result.redirect) return;
      if (!result.success) {
        setError(result.error);
        setGoogleLoading(false);
        setLoginInProgress(false);
        return;
      }

      // Si fue exitoso, verificamos si es profesional
      if (result.user) {
        const professionalsRef = collection(db, 'professionals');
        const q = query(professionalsRef, where('email', '==', result.user.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Desloguear porque es profesional
          await logoutUser();
          setError('Te registraste como profesional. Para acceder a tu cuenta ve al Acceso de Profesionales. Si deseas ingresar como usuario consultante, debes registrarte con otro correo.');
          setGoogleLoading(false);
          setLoginInProgress(false);
          return;
        }

        // Verificar 2FA para usuario Google
        const twoFAEnabled = await is2FAEnabled(result.user.uid);
        if (twoFAEnabled) {
          setPendingUser(result.user);
          setShow2FA(true);
          // Mantenemos loginInProgress true
        } else {
          setLoginInProgress(false); // Puede redirigir
        }
      } else {
        setLoginInProgress(false);
      }
    } catch (error) {
      setError('Error inesperado al iniciar sesión con Google.');
      console.error('Error en login con Google:', error);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handle2FAVerified = () => {
    if (pendingUser) {
      sessionStorage.setItem(`2fa_verified_${pendingUser.uid}`, 'true');
    }
    setShow2FA(false);
    setPendingUser(null);
    setLoginInProgress(false); // Liberar redirección
  };

  const handle2FACancel = async () => {
    setShow2FA(false);
    setPendingUser(null);
    setLoginInProgress(false);
    await logoutUser();
  };

  if (currentUser && !show2FA) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal 2FA */}
      {show2FA && pendingUser && (
        <TwoFactorModal
          isOpen={show2FA}
          uid={pendingUser.uid}
          email={pendingUser.email}
          onVerified={handle2FAVerified}
          onCancel={handle2FACancel}
        />
      )}

      {/* Modal de Recuperación de Contraseña */}
      <ForgotPasswordModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        defaultEmail={formData.email}
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
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Inicia sesión en tu cuenta
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              ¿No tienes una cuenta?{' '}
              <Link to="/crear-cuenta" className="font-medium text-primary-600 hover:text-primary-700 transition-colors">
                Regístrate aquí
              </Link>
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="space-y-5">
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
                    Correo electrónico
                  </label>
                  <input
                    id="email" name="email" type="email" autoComplete="email" required
                    value={formData.email} onChange={handleChange}
                    className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
                    placeholder="tu@email.com"
                    disabled={loading || googleLoading}
                  />
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="password" name="password" type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password" required
                      value={formData.password} onChange={handleChange}
                      className="w-full px-4 py-3 pr-10 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
                      placeholder="Tu contraseña"
                      disabled={loading || googleLoading}
                    />
                    <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword(!showPassword)} disabled={loading || googleLoading}>
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

                {/* Remember / Forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded" disabled={loading || googleLoading} />
                    <span className="text-sm text-gray-700">Recordarme</span>
                  </label>
                  <button 
                    type="button" 
                    className="text-sm font-medium text-primary-600 hover:text-primary-500" 
                    disabled={loading || googleLoading}
                    onClick={() => setShowResetModal(true)}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit" disabled={loading || googleLoading}
                  className="group relative w-full flex justify-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-primary-600 hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 disabled:bg-primary-400 disabled:cursor-not-allowed disabled:hover:translate-y-0 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Iniciando sesión...
                    </span>
                  ) : 'Iniciar Sesión'}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300" /></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white/80 text-gray-500">O continúa con</span></div>
                </div>

                {/* Google */}
                <button
                  type="button" onClick={handleGoogleLogin} disabled={loading || googleLoading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-gray-200 rounded-xl shadow-sm bg-white/80 backdrop-blur-sm text-sm font-medium text-gray-700 hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continuar con Google
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Al continuar aceptás nuestros{' '}
                <button type="button" className="text-primary-600 hover:text-primary-500 font-medium">Términos</button>
                {' '}y{' '}
                <button type="button" className="text-primary-600 hover:text-primary-500 font-medium">Privacidad</button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default Login;
