import emailjs from 'emailjs-com';

/**
 * Utilidad para obtener configuración de EmailJS por tipo de plantilla.
 * Permite usar una cuenta alternativa (ej. si tu plan limita plantillas) definiendo:
 *  - REACT_APP_EMAILJS_SERVICE_ID_<TYPE>
 *  - REACT_APP_EMAILJS_PUBLIC_KEY_<TYPE> (o USER_ID)
 * Donde <TYPE> puede ser: VERIFICATION, STATUS, ACCESS, LOGIN, SESSION
 * Si no existe la variante por tipo, se usa la primaria:
 *  - REACT_APP_EMAILJS_SERVICE_ID
 *  - REACT_APP_EMAILJS_PUBLIC_KEY (o USER_ID)
 */
const getEmailJsConfig = (type) => {
  const upper = type.toUpperCase();
  const serviceId =
    process.env[`REACT_APP_EMAILJS_SERVICE_ID_${upper}`] ||
    process.env.REACT_APP_EMAILJS_SERVICE_ID;

  const userId =
    process.env[`REACT_APP_EMAILJS_PUBLIC_KEY_${upper}`] ||
    process.env[`REACT_APP_EMAILJS_USER_ID_${upper}`] ||
    process.env.REACT_APP_EMAILJS_PUBLIC_KEY ||
    process.env.REACT_APP_EMAILJS_USER_ID;

  const templateId =
    process.env[`REACT_APP_EMAILJS_TEMPLATE_${upper}`] ||
    process.env.REACT_APP_EMAILJS_TEMPLATE_ID;

  return { serviceId, userId, templateId };
};

// Validar formato de email
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Envío genérico con EmailJS para un tipo de plantilla
const sendEmail = async ({ type, templateId, variables }) => {
  const { serviceId, userId, templateId: envTemplate } = getEmailJsConfig(type);
  const finalTemplateId = templateId || envTemplate;

  if (!serviceId || !userId || !finalTemplateId) {
    console.warn(`⚠️ EmailJS no configurado para ${type}, solo se registrará en consola`);
    console.log('Email simulado:', { serviceId, userId, finalTemplateId, variables });
    return { success: true, simulated: true };
  }

  // Validar email del destinatario
  const recipientEmail = variables?.to_email;
  if (!recipientEmail) {
    const error = 'No se proporcionó email del destinatario';
    console.error(`❌ ${error} para ${type}`);
    return { success: false, error };
  }

  if (!isValidEmail(recipientEmail)) {
    const error = `Email del destinatario inválido: ${recipientEmail}`;
    console.error(`❌ ${error} para ${type}`);
    return { success: false, error };
  }

  // Asegurar campos comunes si hay valores opcionales
  const fromEmail = process.env.REACT_APP_EMAILJS_FROM_EMAIL;
  const payload = {
    ...(variables || {}),
    ...(fromEmail ? { from_email: fromEmail, reply_to: fromEmail } : {})
  };

  try {
    console.log(`📧 Enviando email ${type} con EmailJS:`, {
      serviceId,
      templateId: finalTemplateId,
      userId: userId ? `${userId.substring(0, 10)}...` : 'no configurado',
      to_email: variables?.to_email,
      payload_keys: Object.keys(payload),
      payload_values: Object.entries(payload).reduce((acc, [key, value]) => {
        acc[key] = typeof value === 'string' && value.length > 50 ? `${value.substring(0, 50)}...` : value;
        return acc;
      }, {})
    });
    
    const result = await emailjs.send(serviceId, finalTemplateId, payload, userId);
    
    console.log(`✅ Email ${type} enviado exitosamente:`, {
      status: result.status,
      text: result.text,
      to_email: variables?.to_email,
      response: result
    });
    
    // Verificar si realmente se envió (status 200)
    if (result.status === 200) {
      return { success: true, result };
    } else {
      console.warn(`⚠️ Email ${type} devolvió status ${result.status}:`, result);
      return { success: false, error: `Status ${result.status}: ${result.text}`, result };
    }
  } catch (error) {
    const errorMessage = error?.text || error?.message || error?.toString() || 'Error desconocido';
    const errorStatus = error?.status || 'N/A';
    
    console.error(`❌ Error enviando email ${type} con EmailJS:`, {
      error: errorMessage,
      status: errorStatus,
      to_email: variables?.to_email,
      serviceId,
      templateId: finalTemplateId,
      fullError: error
    });
    
    return { success: false, error: errorMessage, status: errorStatus, details: error };
  }
};

// Email con código de acceso
export const sendProfessionalAccessCode = async (email, name, accessCode) => {
  return sendEmail({
    type: 'access',
    variables: {
      to_email: email,
      to_name: name || 'Profesional',
      access_code: accessCode
    }
  });
};

// Aprobación / rechazo de perfil
export const sendVerificationNotification = async (email, name, isApproved, accessCode = null) => {
  return sendEmail({
    type: 'verification',
    variables: {
      to_email: email,
      to_name: name || 'Profesional',
      is_approved: isApproved ? 'Aprobado' : 'Rechazado',
      access_code: accessCode || 'N/A'
    }
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

  const finalStatus = statusMap[status] || status || 'actualizado';

  return sendEmail({
    type: 'status',
    variables: {
      to_email: email,
      to_name: name || 'Profesional',
      status: finalStatus,
      reason: reason || 'No especificado'
    }
  });
};

// Aviso de login profesional
export const sendProfessionalLoginNotification = async ({ email, name, accessCode, loginTime }) => {
  return sendEmail({
    type: 'login',
    variables: {
      to_email: email,
      to_name: name || 'Profesional',
      access_code: accessCode || 'N/A',
      login_time: loginTime || new Date().toLocaleString('es-ES')
    }
  });
};

// Aviso de estado de sesión a usuario
export const sendSessionStatusEmail = async ({ userEmail, userName, professionalName, status, reason }) => {
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: status,
      session_reason: reason || 'Sin motivo indicado'
    }
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
  
  // Formatear fecha
  let formattedDate = '';
  if (scheduledDate) {
    const date = new Date(scheduledDate + 'T00:00:00');
    formattedDate = date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: 'nueva sesión creada',
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      scheduled_date: formattedDate,
      scheduled_time: scheduledTime || '',
      message: `Tu profesional ${professionalName || ''} ha creado una nueva ${sessionTypeMap[sessionType] || 'sesión'} para ti${formattedDate ? ` el ${formattedDate}` : ''}${scheduledTime ? ` a las ${scheduledTime}` : ''}. Por favor, elige si será virtual o presencial en tu panel.`
    }
  });
};

// Notificar al profesional cuando el paciente elige el tipo de sesión
export const sendMeetingTypeChoiceNotification = async ({ professionalEmail, professionalName, userName, sessionType, meetingType, scheduledDate, scheduledTime }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  const meetingTypeLabel = meetingType === 'virtual' ? 'virtual' : 'presencial';
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: professionalEmail,
      to_name: professionalName || 'Profesional',
      user_name: userName || 'Un paciente',
      session_status: 'tipo de sesión elegido',
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      meeting_type: meetingTypeLabel,
      scheduled_date: scheduledDate || '',
      scheduled_time: scheduledTime || '',
      message: `${userName || 'Un paciente'} ha elegido que la sesión será ${meetingTypeLabel}. Por favor, ${meetingType === 'virtual' ? 'envía el enlace de Meet o Zoom' : 'envía la ubicación de la clínica'} en tu panel.`
    }
  });
};

// Notificar al paciente cuando el profesional envía enlace/ubicación
export const sendMeetingDetailsNotification = async ({ userEmail, userName, professionalName, sessionType, meetingType, meetingLink, meetingLocation, scheduledDate, scheduledTime }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  let detailsMessage = '';
  if (meetingType === 'virtual' && meetingLink) {
    detailsMessage = `Enlace de la reunión: ${meetingLink}`;
  } else if (meetingType === 'presencial' && meetingLocation) {
    detailsMessage = `Ubicación: ${meetingLocation}`;
  }
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: 'detalles de sesión enviados',
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      meeting_type: meetingType === 'virtual' ? 'virtual' : 'presencial',
      meeting_details: detailsMessage,
      scheduled_date: scheduledDate || '',
      scheduled_time: scheduledTime || '',
      message: `Tu profesional ha enviado los detalles de tu sesión. ${detailsMessage}`
    }
  });
};

// Notificar actualización de progreso de sesión
export const sendSessionProgressUpdateNotification = async ({ userEmail, userName, professionalName, progress, sessionType }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: 'progreso actualizado',
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      progress: `${progress}%`,
      message: `Tu profesional ha actualizado el progreso de tu ${sessionTypeMap[sessionType] || 'sesión'} al ${progress}%.`
    }
  });
};

// Notificar observaciones añadidas
export const sendSessionObservationsNotification = async ({ userEmail, userName, professionalName, sessionType, hasObservations }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: 'observaciones añadidas',
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      message: `Tu profesional ha añadido observaciones a tu ${sessionTypeMap[sessionType] || 'sesión'}. Puedes verlas en tu panel de control.`
    }
  });
};

// Notificar alta médica
export const sendPatientDischargeNotification = async ({ userEmail, userName, professionalName, dischargeNote }) => {
  return sendEmail({
    type: 'session',
    variables: {
      to_email: userEmail,
      to_name: userName || 'Usuario',
      professional_name: professionalName || 'Tu profesional',
      session_status: 'alta médica',
      message: `Tu profesional te ha dado de alta. ${dischargeNote ? `Nota: ${dischargeNote}` : ''}`,
      discharge_note: dischargeNote || 'Sin nota adicional'
    }
  });
};

// Notificar calificación recibida al profesional (para calificación de sesión)
export const sendSessionRatingNotification = async ({ professionalEmail, professionalName, userName, rating, sessionType }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: professionalEmail,
      to_name: professionalName || 'Profesional',
      user_name: userName || 'Un paciente',
      session_status: 'calificación de sesión recibida',
      rating: `${rating}/5`,
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      message: `${userName || 'Un paciente'} ha calificado tu ${sessionTypeMap[sessionType] || sessionType || 'sesión'} con ${rating} estrellas.`
    }
  });
};

// Notificar calificación recibida al profesional (para calificación del profesional)
export const sendRatingNotification = async ({ professionalEmail, professionalName, userName, rating, sessionType }) => {
  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };
  
  return sendEmail({
    type: 'session',
    variables: {
      to_email: professionalEmail,
      to_name: professionalName || 'Profesional',
      user_name: userName || 'Un paciente',
      session_status: 'calificación recibida',
      rating: `${rating}/5`,
      session_type: sessionTypeMap[sessionType] || sessionType || 'Sesión',
      message: `${userName || 'Un paciente'} te ha calificado con ${rating} estrellas como profesional.`
    }
  });
};

/**
 * Dónde obtener los datos en EmailJS:
 * - Service ID: Dashboard > Email Services > selecciona tu servicio, copia el "Service ID".
 * - Public Key (o User ID): Dashboard > Account > API Keys > Public Key.
 * - Template ID: Dashboard > Email Templates > crea/edita plantilla, copia "Template ID" (ej. template_xxxxxx).
 *
 * Env recomendadas para dos cuentas (primaria y alternativa):
 * # Primaria
 * REACT_APP_EMAILJS_SERVICE_ID=service_xxxx
 * REACT_APP_EMAILJS_PUBLIC_KEY=public_xxxx
 * # Alternativa (para plantillas extra)
 * REACT_APP_EMAILJS_SERVICE_ID_VERIFICATION=service_alt
 * REACT_APP_EMAILJS_PUBLIC_KEY_VERIFICATION=public_alt
 * ... (STATUS/ACCESS/LOGIN/SESSION) según necesites mover cada plantilla a la cuenta alterna.
 * # Templates
 * REACT_APP_EMAILJS_TEMPLATE_VERIFICATION=template_verif
 * REACT_APP_EMAILJS_TEMPLATE_STATUS=template_status
 * REACT_APP_EMAILJS_TEMPLATE_ACCESS=template_access
 * REACT_APP_EMAILJS_TEMPLATE_LOGIN=template_login
 * REACT_APP_EMAILJS_TEMPLATE_SESSION=template_session
 *
 * Si no usas cuentas alternas, basta con definir SERVICE_ID / PUBLIC_KEY y los TEMPLATE_x en la cuenta principal.
 */
