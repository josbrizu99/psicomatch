import React, { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/firebase';

const ForgotPasswordModal = ({ isOpen, onClose, defaultEmail = '' }) => {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');
    setMessage('');

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setStatus('success');
      setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa también tu carpeta de spam.');
    } catch (error) {
      console.error('Error enviando email de recuperación:', error);
      setStatus('error');
      switch (error.code) {
        case 'auth/user-not-found':
          setMessage('No existe ninguna cuenta con este correo.');
          break;
        case 'auth/invalid-email':
          setMessage('El formato del correo es inválido.');
          break;
        case 'auth/too-many-requests':
          setMessage('Has hecho demasiados intentos. Por favor, espera un momento y vuelve a intentarlo.');
          break;
        default:
          setMessage('Ocurrió un error al intentar enviar el enlace. Por favor intenta de nuevo más tarde.');
      }
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setMessage('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
      <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] shadow-2xl max-w-md w-full animate-fade-in-up relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-[-20%] left-[-20%] w-32 h-32 bg-primary-200 rounded-full mix-blend-multiply filter blur-2xl opacity-50" />
        
        <div className="relative z-10">
          <div className="mb-6 text-center">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Recuperar Contraseña</h3>
            <p className="text-sm text-gray-600">
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {status === 'success' ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
                <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800">{message}</p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors shadow-sm"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === 'error' && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-3">
                  <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-sm text-red-800">{message}</p>
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 border border-gray-200 placeholder-gray-400 text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition-all shadow-sm text-sm"
                  placeholder="tu@email.com"
                  disabled={status === 'loading'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={status === 'loading'}
                  className="flex-1 py-3 px-4 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 bg-white/60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading' || !email}
                  className="flex-1 flex justify-center items-center py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-all duration-300 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)] disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                  {status === 'loading' ? (
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
