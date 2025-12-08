/**
 * Utilidades de validación y sanitización
 */

/**
 * Sanitizar input de usuario removiendo HTML y limitando longitud
 */
export const sanitizeInput = (input, maxLength = 1000) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/<[^>]*>/g, '') // Eliminar HTML tags
    .replace(/[<>]/g, '') // Eliminar < y >
    .trim()
    .slice(0, maxLength);
};

/**
 * Validar email
 */
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

/**
 * Validar contraseña fuerte
 * Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número
 */
export const validatePassword = (password) => {
  if (password.length < 8) return false;
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  
  return hasUpperCase && hasLowerCase && hasNumber;
};

/**
 * Validar rating (1-5)
 */
export const validateRating = (rating) => {
  const numRating = Number(rating);
  return Number.isInteger(numRating) && numRating >= 1 && numRating <= 5;
};

/**
 * Validar longitud de texto
 */
export const validateTextLength = (text, min, max) => {
  const length = text.trim().length;
  return length >= min && length <= max;
};

/**
 * Escapar caracteres especiales para prevenir XSS
 */
export const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
};

/**
 * Validar URL
 */
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validar número de teléfono (formato simple)
 */
export const validatePhone = (phone) => {
  const regex = /^[\d\s\-+()]{8,15}$/;
  return regex.test(phone);
};

/**
 * Mensajes de error de validación
 */
export const validationMessages = {
  email: 'Por favor ingresa un email válido',
  password: 'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números',
  required: 'Este campo es requerido',
  minLength: (min) => `Debe tener al menos ${min} caracteres`,
  maxLength: (max) => `No puede exceder ${max} caracteres`,
  rating: 'La calificación debe estar entre 1 y 5',
  phone: 'Por favor ingresa un número de teléfono válido'
};
