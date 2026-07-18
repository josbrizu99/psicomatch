import React, { useState, useRef, useEffect, useCallback } from 'react';
import { request2FACode, verify2FACode } from '../../services/twoFactorService';

const OTP_LENGTH = 6;
const OTP_EXPIRY_SECONDS = 600; // 10 minutes
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Modal de verificación 2FA.
 *
 * Props:
 *   isOpen          - Mostrar / ocultar
 *   uid             - UID del usuario autenticado
 *   email           - Email del usuario (para mostrar a quién se envió)
 *   onVerified()    - Callback cuando el código es correcto
 *   onCancel()      - Callback al cerrar sin verificar (cierra sesión)
 */
const TwoFactorModal = ({ isOpen, uid, email, onVerified, onCancel }) => {
  const [code, setCode] = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [blocked, setBlocked] = useState(false);

  const inputRefs = useRef([]);

  const hasRequested = useRef(false);

  // Auto-send code when modal opens
  useEffect(() => {
    if (isOpen && uid && email && !hasRequested.current) {
      hasRequested.current = true;
      sendCode();
    }
  }, [isOpen, uid, email]);

  // Countdown timer for expiry
  useEffect(() => {
    if (!codeSent || success || blocked) return;
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [codeSent, success, blocked]);

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const sendCode = async () => {
    setSending(true);
    setError('');
    const result = await request2FACode(uid, email);
    setSending(false);

    if (result.success) {
      setCodeSent(true);
      setTimeLeft(OTP_EXPIRY_SECONDS);
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setCode(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      setError(result.error || 'Error al enviar el código');
      if (result.retryAfterSeconds) setResendCooldown(result.retryAfterSeconds);
    }
  };

  const handleInputChange = (index, value) => {
    // Allow only digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Move to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all filled
    if (digit && newCode.every((d) => d !== '')) {
      verifyCode(newCode.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!paste) return;
    const newCode = Array(OTP_LENGTH).fill('');
    paste.split('').forEach((digit, i) => { newCode[i] = digit; });
    setCode(newCode);
    if (paste.length === OTP_LENGTH) verifyCode(paste);
    else inputRefs.current[paste.length]?.focus();
  };

  const verifyCode = async (codeStr) => {
    if (loading || blocked) return;
    setLoading(true);
    setError('');

    const result = await verify2FACode(uid, codeStr);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => onVerified(), 800);
    } else {
      setError(result.error || 'Código incorrecto');
      if (result.attemptsLeft !== undefined) setAttemptsLeft(result.attemptsLeft);
      if (result.blocked) setBlocked(true);
      // Shake and clear
      setCode(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const codeStr = code.join('');
    if (codeStr.length === OTP_LENGTH) verifyCode(codeStr);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.max(b.length, 3)) + c)
    : '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center animate-fade-in-up">
        {/* Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${success ? 'bg-green-100' : blocked ? 'bg-red-100' : 'bg-primary-100'}`}>
          {success ? (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ) : blocked ? (
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {success ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-2">¡Verificado!</h2>
            <p className="text-gray-500 text-sm">Accediendo a tu cuenta...</p>
          </>
        ) : blocked ? (
          <>
            <h2 className="text-xl font-bold text-red-700 mb-2">Cuenta Bloqueada</h2>
            <p className="text-gray-600 text-sm mb-6">
              Demasiados intentos fallidos. Por seguridad, tu sesión fue bloqueada.
              Contactá a soporte si creés que es un error.
            </p>
            <button
              onClick={onCancel}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Verificación de seguridad</h2>
            <p className="text-sm text-gray-500 mb-6">
              {sending ? (
                'Enviando código...'
              ) : codeSent ? (
                <>
                  Ingresá el código de 6 dígitos enviado a<br />
                  <span className="font-medium text-gray-700">{maskedEmail}</span>
                </>
              ) : (
                'Preparando verificación...'
              )}
            </p>

            {/* OTP Inputs */}
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
                {Array(OTP_LENGTH).fill(null).map((_, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputRefs.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={code[i]}
                    onChange={(e) => handleInputChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    disabled={loading || sending || timeLeft === 0}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold border-2 rounded-xl transition-all
                      focus:outline-none focus:ring-2 focus:ring-primary-400
                      ${code[i] ? 'border-primary-400 bg-primary-50 text-primary-700' : 'border-gray-200 bg-gray-50 text-gray-900'}
                      ${error ? 'border-red-300 bg-red-50 animate-shake' : ''}
                      ${loading ? 'opacity-50' : ''}
                    `}
                  />
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-4 flex items-start gap-2">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-red-700 text-left">
                    {error}
                    {attemptsLeft < 5 && attemptsLeft > 0 && (
                      <span className="block text-xs mt-0.5">Intentos restantes: {attemptsLeft}</span>
                    )}
                  </p>
                </div>
              )}

              {/* Timer */}
              {timeLeft > 0 && codeSent ? (
                <p className="text-xs text-gray-400 mb-4">
                  El código expira en{' '}
                  <span className={`font-medium ${timeLeft < 60 ? 'text-red-500' : 'text-gray-600'}`}>
                    {formatTime(timeLeft)}
                  </span>
                </p>
              ) : timeLeft === 0 ? (
                <p className="text-xs text-red-500 mb-4 font-medium">El código expiró. Pedí uno nuevo.</p>
              ) : null}

              {/* Verify button */}
              <button
                type="submit"
                disabled={loading || code.join('').length < OTP_LENGTH || timeLeft === 0}
                className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md mb-4"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Verificando...
                  </span>
                ) : 'Verificar código'}
              </button>

              {/* Resend */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={sendCode}
                  disabled={resendCooldown > 0 || sending}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {resendCooldown > 0
                    ? `Reenviar código en ${resendCooldown}s`
                    : sending ? 'Enviando...' : 'Reenviar código'}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Cancelar y cerrar sesión
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default TwoFactorModal;
