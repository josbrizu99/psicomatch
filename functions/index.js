/* eslint-disable */
require("dotenv").config();

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Configuración global para v2
setGlobalOptions({maxInstances: 10});

admin.initializeApp();

// Configurar transporter de email
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Enviar email de bienvenida cuando se registra un nuevo usuario
 */
exports.sendWelcomeEmail = onDocumentCreated("users/{userId}", async (event) => {
  const newUser = event.data.data();
  const userId = event.params.userId;

  // HTML del email
  const mailOptions = {
    from: "PsicoMatch <noreply@psicomatch.com>",
    to: newUser.email,
    subject: "¡Bienvenido a PsicoMatch!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">¡Hola ${newUser.nombre}!</h1>
        <p>Gracias por unirte a PsicoMatch, tu plataforma de salud mental de confianza.</p>
        <p>Estamos aquí para ayudarte a encontrar el profesional perfecto para ti.</p>
        <h2>Próximos pasos:</h2>
        <ol>
          <li>Completa tu perfil</li>
          <li>Realiza la evaluación inicial</li>
          <li>Explora profesionales recomendados</li>
          <li>Agenda tu primera sesión</li>
        </ol>
        <a href="https://psicomatch.com/dashboard" 
           style="background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
          Ir a mi Dashboard
        </a>
        <p style="color: #666; margin-top: 40px; font-size: 14px;">
          Si tienes alguna pregunta, responde a este email.
        </p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de bienvenida enviado a ${newUser.email}`);

    // Registrar en Firestore
    await admin.firestore().collection("emailLogs").add({
      type: "welcome",
      userId,
      email: newUser.email,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "sent",
    });

    return null;
  } catch (error) {
    console.error("❌ Error enviando email:", error);

    // Registrar error
    await admin.firestore().collection("emailLogs").add({
      type: "welcome",
      userId,
      email: newUser.email,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "error",
      error: error.message,
    });

    throw error;
  }
});

/**
 * Enviar recordatorios de sesiones próximas
 * Se ejecuta cada hora
 */
exports.sendSessionReminders = onSchedule("every 1 hours", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // Calcular 24 horas desde ahora
  const tomorrow = new Date(now.toDate());
  tomorrow.setHours(tomorrow.getHours() + 24);

  // Buscar sesiones en próximas 24 horas que no han sido recordadas
  const sessionsSnapshot = await db.collection("sessions")
    .where("scheduledAt", ">", now)
    .where("scheduledAt", "<", admin.firestore.Timestamp.fromDate(tomorrow))
    .where("status", "==", "scheduled")
    .where("reminderSent", "==", false)
    .get();

  const promises = [];

  sessionsSnapshot.forEach((doc) => {
    const session = doc.data();

    // Enviar email al usuario
    promises.push(
      sendSessionReminderEmail(session.userId, session, "user")
    );

    // Enviar email al profesional
    promises.push(
      sendSessionReminderEmail(session.professionalId, session, "professional")
    );

    // Marcar como recordado
    promises.push(
      doc.ref.update({reminderSent: true})
    );
  });

  await Promise.all(promises);
  console.log(`✅ Recordatorios enviados para ${sessionsSnapshot.size} sesiones`);

  return null;
});

/**
 * Helper para enviar emails de recordatorio
 * @param {string} recipientId ID del destinatario
 * @param {object} session Datos de la sesión
 * @param {string} recipientType 'user' o 'professional'
 */
async function sendSessionReminderEmail(recipientId, session, recipientType) {
  const db = admin.firestore();
  const userDoc = await db.collection(
    recipientType === "user" ? "users" : "professionals"
  ).doc(recipientId).get();

  const user = userDoc.data();
  if (!user || !user.email) return;

  const sessionDate = session.scheduledAt.toDate();
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  const mailOptions = {
    from: "PsicoMatch <noreply@psicomatch.com>",
    to: user.email,
    subject: "Recordatorio: Sesión Próxima en PsicoMatch",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Recordatorio de Sesión</h1>
        <p>Hola ${user.nombre},</p>
        <p>Te recordamos que tienes una sesión programada:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>📅 Fecha:</strong> ${sessionDate.toLocaleDateString("es-ES", options)}</p>
          <p><strong>⏰ Duración:</strong> 60 minutos</p>
          ${session.type === "online" ?
            "<p><strong>💻 Modalidad:</strong> Online (recibirás el enlace por email)</p>" :
            "<p><strong>📍 Modalidad:</strong> Presencial</p>"}
        </div>
        <p>Por favor, asegúrate de estar disponible con anticipación.</p>
        <a href="https://psicomatch.com/sessions/${session.id}" 
           style="background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
          Ver Detalles de la Sesión
        </a>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

/**
 * Notificar cuando se crea un nuevo match
 */
exports.notifyNewMatch = onDocumentCreated("matches/{matchId}", async (event) => {
  const match = event.data.data();
  const db = admin.firestore();

  // Obtener datos del usuario y profesional
  const [userDoc, professionalDoc] = await Promise.all([
    db.collection("users").doc(match.userId).get(),
    db.collection("professionals").doc(match.professionalId).get(),
  ]);

  const user = userDoc.data();
  const professional = professionalDoc.data();

  // Email al usuario
  await transporter.sendMail({
    from: "PsicoMatch <noreply@psicomatch.com>",
    to: user.email,
    subject: "¡Tenemos un profesional perfecto para ti!",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">¡Nuevo Match! 🎉</h1>
        <p>Hola ${user.nombre},</p>
        <p>Hemos encontrado un profesional que se ajusta perfectamente a tus necesidades:</p>
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2>${professional.nombre}</h2>
          <p><strong>Especialidad:</strong> ${professional.especialidad}</p>
          <p><strong>Experiencia:</strong> ${professional.yearsOfExperience} años</p>
          <p><strong>Rating:</strong> ⭐ ${professional.averageRating}/5.0</p>
          <p><strong>% de Compatibilidad:</strong> ${match.score}%</p>
        </div>
        <a href="https://psicomatch.com/professional/${match.professionalId}" 
           style="background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 8px; display: inline-block;">
          Ver Perfil Completo
        </a>
      </div>
    `,
  });

  // Email al profesional
  await transporter.sendMail({
    from: "PsicoMatch <noreply@psicomatch.com>",
    to: professional.email,
    subject: "Nuevo paciente potencial en PsicoMatch",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1;">Nuevo Paciente Potencial</h1>
        <p>Hola ${professional.nombre},</p>
        <p>Un nuevo usuario está buscando profesionales con tu perfil.</p>
        <p>Asegúrate de tener tu calendario actualizado para recibir solicitudes de sesión.</p>
        <a href="https://psicomatch.com/professional-dashboard" 
           style="background: #6366f1; color: white; padding: 12px 24px; 
                  text-decoration: none; border-radius: 8px; display: inline-block; margin-top: 20px;">
          Ir a mi Dashboard
        </a>
      </div>
    `,
  });

  console.log(`✅ Notificaciones de match enviadas: ${match.userId} <-> ${match.professionalId}`);
  return null;
});

/**
 * Marcar sesiones como expiradas si pasó la fecha y no se completaron
 * Se ejecuta diariamente a las 2 AM
 */
exports.markExpiredSessions = onSchedule("0 2 * * *", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  // Buscar sesiones programadas que ya pasaron
  const expiredSnapshot = await db.collection("sessions")
    .where("scheduledAt", "<", now)
    .where("status", "==", "scheduled")
    .get();

  const batch = db.batch();
  let count = 0;

  expiredSnapshot.forEach((doc) => {
    batch.update(doc.ref, {
      status: "expired",
      expiredAt: now,
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`✅ Marcadas ${count} sesiones como expiradas`);
  }

  return null;
});

/**
 * Función callable para validar profesionales (solo admins)
 */
exports.validateProfessional = onCall(async (request) => {
  // Verificar autenticación
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Debes estar autenticado"
    );
  }

  // Verificar que sea admin
  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const user = userDoc.data();

  if (!user || user.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Solo administradores pueden validar profesionales"
    );
  }

  const {professionalId, approved, reason} = request.data;

  if (!professionalId) {
    throw new HttpsError(
      "invalid-argument",
      "professionalId es requerido"
    );
  }

  // Actualizar profesional
  const profRef = db.collection("professionals").doc(professionalId);
  await profRef.update({
    isApproved: approved,
    approvedAt: approved ? admin.firestore.FieldValue.serverTimestamp() : null,
    approvedBy: request.auth.uid,
    rejectionReason: approved ? null : reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Enviar email al profesional
  const profDoc = await profRef.get();
  const professional = profDoc.data();

  if (professional && professional.email) {
    const subject = approved ?
      "¡Tu cuenta ha sido aprobada!" :
      "Actualización sobre tu registro";

    const html = approved ? `
      <h1 style="color: #10b981;">¡Felicitaciones!</h1>
      <p>Tu cuenta profesional en PsicoMatch ha sido aprobada.</p>
      <p>Ya puedes comenzar a recibir pacientes.</p>
    ` : `
      <h1 style="color: #f59e0b;">Actualización de Registro</h1>
      <p>Lamentablemente, no pudimos aprobar tu cuenta en este momento.</p>
      <p><strong>Razón:</strong> ${reason || "No especificada"}</p>
      <p>Por favor, contacta a soporte para más información.</p>
    `;

    await transporter.sendMail({
      from: "PsicoMatch <noreply@psicomatch.com>",
      to: professional.email,
      subject,
      html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">${html}</div>`,
    });
  }

  return {
    success: true,
    message: approved ? "Profesional aprobado" : "Profesional rechazado",
  };
});
