// Traductor de errores de Firebase Auth a mensajes amigables en español
export const translateAuthError = (error) => {
  console.log('🔍 Error original de Firebase:', error.code, error.message);
  
  switch (error.code) {
    // Errores de credenciales
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return {
        message: 'Correo electrónico o contraseña incorrectos',
        type: 'error',
        showRetry: true
      };
    
    // Errores de usuario no encontrado
    case 'auth/user-disabled':
      return {
        message: 'Esta cuenta ha sido deshabilitada. Contacta al administrador',
        type: 'error',
        showRetry: false
      };
    
    // Errores de red
    case 'auth/network-request-failed':
      return {
        message: 'Error de conexión. Verifica tu conexión a internet',
        type: 'error',
        showRetry: true
      };
    
    // Errores de demasiados intentos
    case 'auth/too-many-requests':
      return {
        message: 'Demasiados intentos fallidos. Intenta más tarde',
        type: 'error',
        showRetry: false
      };
    
    // Errores de email ya en uso
    case 'auth/email-already-in-use':
      return {
        message: 'Este correo electrónico ya está registrado',
        type: 'error',
        showRetry: false
      };
    
    // Errores de contraseña débil
    case 'auth/weak-password':
      return {
        message: 'La contraseña debe tener al menos 6 caracteres',
        type: 'error',
        showRetry: true
      };
    
    // Errores de operación no permitida
    case 'auth/operation-not-allowed':
      return {
        message: 'Esta operación no está permitida. Contacta al administrador',
        type: 'error',
        showRetry: false
      };
    
    // Errores de Google Auth
    case 'auth/popup-closed-by-user':
      return {
        message: 'Inicio de sesión cancelado',
        type: 'warning',
        showRetry: true
      };
    
    case 'auth/popup-blocked':
      return {
        message: 'El popup fue bloqueado. Permite popups para este sitio',
        type: 'warning',
        showRetry: true
      };
    
    // Errores de configuración
    case 'auth/configuration-not-found':
      return {
        message: 'Error de configuración. Contacta al administrador',
        type: 'error',
        showRetry: false
      };
    
    // Error por defecto
    default:
      return {
        message: 'Error de autenticación. Intenta nuevamente',
        type: 'error',
        showRetry: true
      };
  }
};

// Función para obtener un mensaje de error específico para profesionales
export const translateProfessionalAuthError = (error) => {
  const baseError = translateAuthError(error);
  
  // Si es un error de credenciales, personalizar para profesionales
  if (error.code === 'auth/invalid-credential' || 
      error.code === 'auth/wrong-password' || 
      error.code === 'auth/user-not-found') {
    return {
      ...baseError,
      message: 'Email, contraseña o código de acceso incorrectos'
    };
  }
  
  return baseError;
};

// Función para mostrar errores en la UI
export const displayAuthError = (error, setError) => {
  const translatedError = translateAuthError(error);
  
  setError({
    message: translatedError.message,
    type: translatedError.type,
    showRetry: translatedError.showRetry
  });
  
  // Auto-ocultar después de 5 segundos para warnings
  if (translatedError.type === 'warning') {
    setTimeout(() => {
      setError(null);
    }, 5000);
  }
};

// Función para mostrar errores específicos de profesionales
export const displayProfessionalAuthError = (error, setError) => {
  const translatedError = translateProfessionalAuthError(error);
  
  setError({
    message: translatedError.message,
    type: translatedError.type,
    showRetry: translatedError.showRetry
  });
  
  // Auto-ocultar después de 5 segundos para warnings
  if (translatedError.type === 'warning') {
    setTimeout(() => {
      setError(null);
    }, 5000);
  }
};

