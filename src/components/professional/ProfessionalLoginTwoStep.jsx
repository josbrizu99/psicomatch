import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase/firebase';
import { isValidAccessCode } from '../../services/professionalAccessCodeService';
import { sendProfessionalLoginNotification } from '../../services/emailService';

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
      console.log('✅ Autenticando credenciales en Firebase Auth...');
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

      console.log('🔍 Verificando datos del profesional:', {
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
      setProfessionalData({ ...data, id: professionalId });
      setStep(2);
      setSuccess('Credenciales verificadas. Ahora ingresa tu código de acceso.');

    } catch (error) {
      console.error('❌ Error en paso 1:', error);

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
      console.log('🔄 Actualizando sesiones:', {
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

      console.log('✅ Profesional logueado exitosamente, sesiones actualizadas:', newTotalSessions);
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
      console.error('❌ Error en paso 2:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="flex items-center justify-center space-x-2 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">
              Psicomatch
            </span>
          </Link>

          <div className="bg-white rounded-full px-6 py-2 inline-flex items-center space-x-2 shadow-sm">
            <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Panel Profesional</span>
          </div>

          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 1 ? 'Ingresa tus credenciales' : 'Ingresa tu código de acceso'}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
            1
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
            2
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleStepOne}>
              {/* Mensajes de estado */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="ml-3 text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email profesional
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="tu.email@ejemplo.com"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-gray-900 placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center z-10 cursor-pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Botón de envío */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    'Continuar'
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleStepTwo}>
              {/* Mensajes de estado */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="ml-3 text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="ml-3 text-sm text-green-800">{success}</p>
                  </div>
                </div>
              )}

              {/* Información del profesional */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">
                      {professionalData?.name} - {professionalData?.specialty}
                    </p>
                    <p className="text-sm text-blue-700">
                      {professionalData?.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Código de acceso */}
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-2">
                  Código de acceso
                </label>
                <div className="relative">
                  <input
                    id="accessCode"
                    name="accessCode"
                    type="text"
                    maxLength="5"
                    required
                    value={formData.accessCode}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors text-center text-lg font-mono tracking-widest text-gray-900 placeholder-gray-400 caret-gray-900"
                    placeholder="12345"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Código de 5 dígitos proporcionado por el administrador
                </p>
              </div>

              {/* Botones */}
              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={goBackToStepOne}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors duration-200"
                >
                  Volver
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-700 hover:to-secondary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Información adicional */}
          <div className="mt-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">¿No tienes acceso?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Regístrate como profesional para obtener acceso a la plataforma.
                  </p>
                </div>
              </div>
            </div>

            {/* Enlace al registro */}
            <div className="text-center">
              <Link
                to="/professional-registration"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Registrarse como Profesional
              </Link>
            </div>
          </div>
        </div>

        {/* Enlaces adicionales */}
        <div className="text-center">
          <Link
            to="/"
            className="text-sm text-primary-600 hover:text-primary-500 transition-colors"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalLoginTwoStep;

