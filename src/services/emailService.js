import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firebase';

// Helpers
const callEmailFunction = async (functionName, payload) => {
  try {
    const emailFunction = httpsCallable(functions, functionName);
    const result = await emailFunction(payload);
    console.log(`📧 Email enviado exitosamente vía ${functionName}`);
    return { success: true, result: result.data };
  } catch (error) {
    console.error(`❌ Error enviando email vía ${functionName}:`, error);
    return { success: false, error: error.message };
  }
};

// ────────────────────────────────────────────────────────────
// Métodos exportados (Unificados bajo Firebase Cloud Functions)
// ────────────────────────────────────────────────────────────

// Email con código de acceso
export const sendProfessionalAccessCode = async (email, name, accessCode) => {
  return callEmailFunction('sendProfessionalAccessCodeEmail', {
    email,
    name: name || 'Profesional',
    accessCode
  });
};

// Aprobación / rechazo de perfil
export const sendVerificationNotification = async (email, name, isApproved, accessCode = null) => {
  return callEmailFunction('sendProfessionalVerificationEmail', {
    email,
    name: name || 'Profesional',
    isApproved,
    accessCode: accessCode || 'N/A'
  });
};

// Cambios de estado (desactivar/pausar/eliminar/reactivar)
export const sendProfessionalStatusEmail = async ({ email, name, status, reason }) => {
  const statusMap = {
    reactivated: 'reactivado',
    inactive: 'desactivado',
    paused: 'pausado',
    deleted: 'eliminado'
  };

  return callEmailFunction('sendProfessionalStatusEmail', {
    email,
    name: name || 'Profesional',
    status: statusMap[status] || status || 'actualizado',
    reason: reason || 'No especificado'
  });
};

// Aviso de login profesional
export const sendProfessionalLoginNotification = async ({ email, name, accessCode, loginTime }) => {
  return callEmailFunction('sendProfessionalLoginEmail', {
    email,
    name: name || 'Profesional',
    accessCode: accessCode || 'N/A',
    loginTime: loginTime || new Date().toLocaleString('es-ES')
  });
};

// Aviso de estado de sesión a usuario
export const sendSessionStatusEmail = async ({ userEmail, userName, professionalName, status, reason }) => {
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: 'Sesión',
    message: `El estado de tu sesión con ${professionalName || 'tu profesional'} ha cambiado a: ${status}.`,
    details: reason ? `Motivo: ${reason}` : null
  });
};

// Notificar creación de nueva sesión
export const sendNewSessionNotification = async ({ userEmail, userName, professionalName, sessionType, scheduledDate, scheduledTime }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  let formattedDate = '';
  if (scheduledDate) {
    const date = new Date(scheduledDate + 'T00:00:00');
    formattedDate = date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: sessionTypeMap[sessionType] || sessionType || 'Sesión',
    message: `Tu profesional ${professionalName || ''} ha creado una nueva ${sessionTypeMap[sessionType] || 'sesión'} para ti${formattedDate ? ` el ${formattedDate}` : ''}${scheduledTime ? ` a las ${scheduledTime}` : ''}.`,
    details: 'Por favor, elige si será virtual o presencial en tu panel.'
  });
};

// Notificar al profesional cuando el paciente elige el tipo de sesión
export const sendMeetingTypeChoiceNotification = async ({ professionalEmail, professionalName, userName, sessionType, meetingType, scheduledDate, scheduledTime }) => {
  const meetingTypeLabel = meetingType === 'virtual' ? 'virtual' : 'presencial';
  
  return callEmailFunction('sendSessionNotification', {
    toEmail: professionalEmail,
    toName: professionalName || 'Profesional',
    sessionType: sessionType || 'Sesión',
    message: `${userName || 'Un paciente'} ha elegido que la sesión será ${meetingTypeLabel}.`,
    details: `Por favor, ${meetingType === 'virtual' ? 'envía el enlace de Meet o Zoom' : 'envía la ubicación de la clínica'} en tu panel.`
  });
};

// Notificar al paciente cuando el profesional envía enlace/ubicación
export const sendMeetingDetailsNotification = async ({ userEmail, userName, professionalName, sessionType, meetingType, meetingLink, meetingLocation, scheduledDate, scheduledTime }) => {
  let detailsMessage = '';
  if (meetingType === 'virtual' && meetingLink) {
    detailsMessage = `Enlace de la reunión: ${meetingLink}`;
  } else if (meetingType === 'presencial' && meetingLocation) {
    detailsMessage = `Ubicación: ${meetingLocation}`;
  }
  
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: sessionType || 'Sesión',
    message: `Tu profesional ha enviado los detalles de tu sesión.`,
    details: detailsMessage
  });
};

// Notificar actualización de progreso de sesión
export const sendSessionProgressUpdateNotification = async ({ userEmail, userName, professionalName, progress, sessionType }) => {
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: sessionType || 'Sesión',
    message: `Tu profesional ha actualizado el progreso de tu sesión.`,
    details: `Progreso actual: ${progress}%`
  });
};

// Notificar observaciones añadidas
export const sendSessionObservationsNotification = async ({ userEmail, userName, professionalName, sessionType, hasObservations }) => {
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: sessionType || 'Sesión',
    message: `Tu profesional ha añadido observaciones a tu sesión.`,
    details: `Puedes verlas en tu panel de control.`
  });
};

// Notificar alta médica
export const sendPatientDischargeNotification = async ({ userEmail, userName, professionalName, dischargeNote }) => {
  return callEmailFunction('sendSessionNotification', {
    toEmail: userEmail,
    toName: userName || 'Usuario',
    sessionType: 'Sesión',
    message: `Tu profesional te ha dado de alta.`,
    details: dischargeNote ? `Nota adicional: ${dischargeNote}` : 'Sin notas adicionales.'
  });
};

// Notificar calificación de sesión
export const sendSessionRatingNotification = async ({ professionalEmail, professionalName, userName, rating, sessionType }) => {
  return callEmailFunction('sendRatingNotificationEmail', {
    toEmail: professionalEmail,
    toName: professionalName || 'Profesional',
    rating: rating,
    message: `${userName || 'Un paciente'} ha calificado la sesión con ${rating} estrellas.`
  });
};

// Notificar calificación de profesional
export const sendRatingNotification = async ({ professionalEmail, professionalName, userName, rating, sessionType }) => {
  return callEmailFunction('sendRatingNotificationEmail', {
    toEmail: professionalEmail,
    toName: professionalName || 'Profesional',
    rating: rating,
    message: `${userName || 'Un paciente'} te ha calificado con ${rating} estrellas como profesional.`
  });
};
