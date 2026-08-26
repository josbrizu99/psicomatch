/**
 * Servicio de Autenticación de Dos Factores (2FA) por Email OTP
 *
 * Seguridad implementada:
 * - El código OTP se genera server-side via Firebase Function callable
 * - El código se guarda HASHEADO en Firestore, no en texto plano
 * - TTL de 10 minutos
 * - Máximo 5 intentos fallidos antes de bloquear
 * - Rate limiting: no se puede pedir un nuevo código si el anterior tiene menos de 60s
 * - El código se invalida tras ser usado correctamente
 */

import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

/**
 * Solicita el envío de un código 2FA al email del usuario.
 * El código se genera y almacena via Cloud Function (server-side).
 * @param {string} uid - UID del usuario
 * @param {string} email - Email al que enviar el código
 * @returns {Promise<{success: boolean, error?: string, retryAfterSeconds?: number}>}
 */
export const request2FACode = async (uid, email) => {
  try {
    const generate2FA = httpsCallable(functions, 'generate2FACode');
    const result = await generate2FA({ uid, email });

    if (result.data.success) {
      console.log('✅ Código 2FA enviado');
      return { success: true };
    }

    return { success: false, error: result.data.error || 'Error al enviar código' };
  } catch (error) {
    console.error('❌ Error al solicitar código 2FA:', error);

    // Manejar rate limiting
    if (error.code === 'functions/resource-exhausted') {
      const seconds = error.details?.retryAfterSeconds || 60;
      return {
        success: false,
        error: `Esperá ${seconds} segundos antes de pedir un nuevo código.`,
        retryAfterSeconds: seconds,
      };
    }

    return { success: false, error: 'Error al enviar el código. Intentá de nuevo.' };
  }
};

/**
 * Verifica el código 2FA ingresado por el usuario.
 * La verificación se hace server-side para mayor seguridad.
 * @param {string} uid - UID del usuario
 * @param {string} code - Código de 6 dígitos ingresado
 * @returns {Promise<{success: boolean, error?: string, attemptsLeft?: number}>}
 */
export const verify2FACode = async (uid, code) => {
  try {
    const verify2FA = httpsCallable(functions, 'verify2FACode');
    const result = await verify2FA({ uid, code: code.trim() });

    if (result.data.success) {
      console.log('✅ Código 2FA verificado correctamente');
      return { success: true };
    }

    return {
      success: false,
      error: result.data.error || 'Código incorrecto',
      attemptsLeft: result.data.attemptsLeft,
    };
  } catch (error) {
    console.error('❌ Error al verificar código 2FA:', error);

    if (error.code === 'functions/not-found') {
      return { success: false, error: 'Código expirado. Solicitá uno nuevo.' };
    }

    if (error.code === 'functions/resource-exhausted') {
      return {
        success: false,
        error: 'Demasiados intentos fallidos. Tu sesión fue bloqueada por seguridad.',
        blocked: true,
      };
    }

    return { success: false, error: 'Error al verificar el código. Intentá de nuevo.' };
  }
};

/**
 * Verifica si el usuario tiene 2FA habilitado
 * @param {string} uid - UID del usuario
 */
export const is2FAEnabled = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;
    return userDoc.data()?.twoFactorEnabled === true;
  } catch {
    return false;
  }
};

/**
 * Habilita o deshabilita el 2FA para el usuario
 * @param {string} uid - UID del usuario
 * @param {boolean} enabled - true para habilitar, false para deshabilitar
 */
export const toggle2FA = async (uid, enabled) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      twoFactorEnabled: enabled,
      twoFactorUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error al cambiar 2FA:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Verifica si el profesional tiene 2FA habilitado
 */
export const isProfessional2FAEnabled = async (uid) => {
  try {
    const profDoc = await getDoc(doc(db, 'professionals', uid));
    if (!profDoc.exists()) return false;
    return profDoc.data()?.twoFactorEnabled === true;
  } catch {
    return false;
  }
};

/**
 * Habilita o deshabilita el 2FA para el profesional
 * @param {string} uid - UID del profesional
 * @param {boolean} enabled - true para habilitar, false para deshabilitar
 */
export const toggleProfessional2FA = async (uid, enabled) => {
  try {
    await updateDoc(doc(db, 'professionals', uid), {
      twoFactorEnabled: enabled,
      twoFactorUpdatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error al cambiar 2FA del profesional:', error);
    return { success: false, error: error.message };
  }
};
