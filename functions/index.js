/* eslint-disable */
// require("dotenv").config();

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Configuración global para v2
setGlobalOptions({maxInstances: 10, cors: true});

admin.initializeApp();

// ────────────────────────────────────────────────────────────
// Email Transporter
// ────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD, // App Password de Google
  },
});

const FROM_ADDRESS = `PsicoMatch <${process.env.EMAIL_USER || "noreply@psicomatch.com"}>`;
const APP_URL = process.env.APP_URL || "https://psicomatch2026.web.app";

// ────────────────────────────────────────────────────────────
// Helpers de Email (Templates HTML Mejorados)
// ────────────────────────────────────────────────────────────

const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>PsicoMatch</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#14b8a6,#6366f1);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px;">PsicoMatch</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Tu salud mental, nuestra prioridad</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:24px 40px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} PsicoMatch · Todos los derechos reservados<br/>
                <a href="${APP_URL}" style="color:#14b8a6;text-decoration:none;">psicomatch.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ctaButton = (url, text) =>
  `<a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#14b8a6,#6366f1);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:600;margin-top:24px;">${text}</a>`;

const infoBox = (content) =>
  `<div style="background:#f0fdf9;border-left:4px solid #14b8a6;border-radius:8px;padding:16px 20px;margin:20px 0;">${content}</div>`;

async function sendMail({to, subject, html}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn("⚠️ EMAIL_USER o EMAIL_PASSWORD no configurados. Email simulado.");
    console.log("Email simulado:", {to, subject});
    return;
  }
  await transporter.sendMail({from: FROM_ADDRESS, to, subject, html});
  // Log to Firestore
  await admin.firestore().collection("emailLogs").add({
    to, subject,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    status: "sent",
  });
}

// ────────────────────────────────────────────────────────────
// Trigger: Email de Bienvenida (al crear usuario)
// ────────────────────────────────────────────────────────────
exports.sendWelcomeEmail = onDocumentCreated("users/{userId}", async (event) => {
  const user = event.data.data();
  if (!user?.email) return null;

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">¡Hola, ${user.name || "bienvenido"}! 👋</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">Gracias por unirte a <strong>PsicoMatch</strong>. Estamos aquí para ayudarte a encontrar el profesional de salud mental perfecto para vos.</p>
    ${infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">Próximos pasos:</p>
      <ol style="margin:0;padding-left:20px;color:#4b5563;font-size:14px;line-height:2;">
        <li>Completá tu perfil</li>
        <li>Realizá la evaluación emocional inicial</li>
        <li>Dejá que nuestro algoritmo te encuentre el mejor profesional</li>
        <li>Agendá tu primera sesión</li>
      </ol>
    `)}
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/dashboard`, "Ir a mi Dashboard")}
    </div>
    <p style="color:#9ca3af;font-size:13px;margin-top:32px;">Si no creaste esta cuenta, ignorá este email o contactanos.</p>
  `);

  try {
    await sendMail({
      to: user.email,
      subject: "¡Bienvenido a PsicoMatch! 🌿",
      html,
    });
    console.log(`✅ Email de bienvenida enviado a ${user.email}`);
  } catch (err) {
    console.error("❌ Error enviando email de bienvenida:", err);
  }
  return null;
});

// ────────────────────────────────────────────────────────────
// Callable: Enviar notificación de login
// ────────────────────────────────────────────────────────────
exports.sendLoginNotification = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado");

  const {email, name, loginTime} = request.data;
  const formattedTime = loginTime
    ? new Date(loginTime).toLocaleString("es-PY", {timeZone: "America/Asuncion"})
    : new Date().toLocaleString("es-PY", {timeZone: "America/Asuncion"});

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Nuevo inicio de sesión 🔐</h2>
    <p style="color:#4b5563;font-size:15px;">Hola <strong>${name || "usuario"}</strong>, detectamos un inicio de sesión en tu cuenta.</p>
    ${infoBox(`
      <p style="margin:0 0 6px;color:#0f766e;font-weight:600;">Detalles del acceso:</p>
      <p style="margin:0;color:#4b5563;font-size:14px;">🕐 <strong>Fecha y hora:</strong> ${formattedTime}</p>
    `)}
    <p style="color:#6b7280;font-size:14px;">Si fuiste vos, no necesitás hacer nada. Si no reconocés este acceso, <strong>cambiá tu contraseña inmediatamente</strong>.</p>
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/dashboard`, "Ir a mi cuenta")}
    </div>
  `);

  try {
    await sendMail({to: email, subject: "Nuevo inicio de sesión en PsicoMatch", html});
    return {success: true};
  } catch (err) {
    console.error("❌ Error enviando notificación de login:", err);
    return {success: false, error: err.message};
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Notificación de Emparejamiento al Usuario
// ────────────────────────────────────────────────────────────
exports.sendMatchNotificationUser = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado");

  const {userEmail, userName, professionalName, professionalSpecialty, professionalEmail, compatibilityScore} = request.data;

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">¡Encontramos tu match! 🎉</h2>
    <p style="color:#4b5563;font-size:15px;">Hola <strong>${userName}</strong>, basándonos en tu evaluación emocional, hemos encontrado el profesional ideal para vos:</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:#0f766e;font-weight:700;font-size:16px;">👨‍⚕️ ${professionalName}</p>
      <p style="margin:0 0 4px;color:#4b5563;font-size:14px;">🎯 <strong>Especialidad:</strong> ${professionalSpecialty || "Psicología General"}</p>
      ${compatibilityScore ? `<p style="margin:0;color:#4b5563;font-size:14px;">💯 <strong>Compatibilidad:</strong> ${Math.round(compatibilityScore)}%</p>` : ""}
    `)}
    <p style="color:#6b7280;font-size:14px;">Podés ver el perfil completo de tu profesional y coordinar tu primera sesión desde el dashboard.</p>
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/dashboard`, "Ver mi profesional asignado")}
    </div>
  `);

  try {
    await sendMail({to: userEmail, subject: "¡Tenemos un profesional perfecto para vos! 🌟", html});
    return {success: true};
  } catch (err) {
    console.error("❌ Error:", err);
    return {success: false};
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Notificación de Nuevo Paciente al Profesional
// ────────────────────────────────────────────────────────────
exports.sendMatchNotificationProfessional = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado");

  const {professionalEmail, professionalName, userName, userSpecialtyNeeds} = request.data;

  const hasNeeds = Array.isArray(userSpecialtyNeeds)
    ? userSpecialtyNeeds.length > 0
    : (userSpecialtyNeeds && userSpecialtyNeeds.toString().trim() !== "");

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Nuevo paciente asignado</h2>
    <p style="color:#4b5563;font-size:15px;">Hola <strong>${professionalName}</strong>, un nuevo usuario ha sido emparejado con vos según su perfil de necesidades.</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:#0f766e;font-weight:600;">Información del paciente:</p>
      <p style="margin:0 0 4px;color:#4b5563;font-size:14px;"><strong>Nombre:</strong> ${userName}</p>
      ${hasNeeds ? `<p style="margin:0;color:#4b5563;font-size:14px;"><strong>Necesidades:</strong> ${Array.isArray(userSpecialtyNeeds) ? userSpecialtyNeeds.join(", ") : userSpecialtyNeeds}</p>` : ""}
    `)}
    <p style="color:#6b7280;font-size:14px;">Ingresá al dashboard para ver el perfil del paciente y coordinar la primera sesión.</p>
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/professional-dashboard`, "Ir a mi Dashboard")}
    </div>
  `);

  try {
    await sendMail({to: professionalEmail, subject: "Nuevo paciente asignado en PsicoMatch", html});
    return {success: true};
  } catch (err) {
    console.error("Error sending match notification to professional:", err);
    return {success: false};
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Notificación de Detalles de Sesión al Usuario
// ────────────────────────────────────────────────────────────
exports.sendSessionDetailsNotification = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado");

  const {userEmail, userName, professionalName, sessionDate, sessionType, sessionLink, sessionAddress, sessionNotes} = request.data;

  const modalityInfo = sessionType === "online"
    ? `<p style="margin:0 0 4px;color:#4b5563;font-size:14px;">💻 <strong>Modalidad:</strong> Online</p>
       ${sessionLink ? `<p style="margin:0;color:#4b5563;font-size:14px;">🔗 <strong>Enlace:</strong> <a href="${sessionLink}" style="color:#14b8a6;">${sessionLink}</a></p>` : ""}`
    : `<p style="margin:0 0 4px;color:#4b5563;font-size:14px;">📍 <strong>Modalidad:</strong> Presencial</p>
       ${sessionAddress ? `<p style="margin:0;color:#4b5563;font-size:14px;">🗺️ <strong>Dirección:</strong> ${sessionAddress}</p>` : ""}`;

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Detalles de tu sesión 📅</h2>
    <p style="color:#4b5563;font-size:15px;">Hola <strong>${userName}</strong>, tu profesional <strong>${professionalName}</strong> ha confirmado los detalles de tu próxima sesión:</p>
    ${infoBox(`
      <p style="margin:0 0 8px;color:#0f766e;font-weight:600;">Información de la sesión:</p>
      ${sessionDate ? `<p style="margin:0 0 4px;color:#4b5563;font-size:14px;">🕐 <strong>Fecha y hora:</strong> ${sessionDate}</p>` : ""}
      ${modalityInfo}
      ${sessionNotes ? `<p style="margin:8px 0 0;color:#6b7280;font-size:13px;font-style:italic;">📝 ${sessionNotes}</p>` : ""}
    `)}
    <p style="color:#6b7280;font-size:14px;">Si necesitás reagendar o tenés alguna pregunta, contactá a tu profesional a través del chat de la plataforma.</p>
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/dashboard`, "Ver en mi Dashboard")}
    </div>
  `);

  try {
    await sendMail({to: userEmail, subject: "Detalles de tu próxima sesión en PsicoMatch 🗓️", html});
    return {success: true};
  } catch (err) {
    console.error("❌ Error:", err);
    return {success: false};
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Chequear si el email ya existe
// ────────────────────────────────────────────────────────────
exports.checkEmailExists = onCall({ cors: true }, async (request) => {
  const { email } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "email es requerido");

  try {
    await admin.auth().getUserByEmail(email);
    // Si no lanza error, el usuario existe
    return { exists: true };
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return { exists: false };
    }
    throw new HttpsError("internal", "Error verificando el email");
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Generar y enviar código de Registro (Pre-Auth)
// ────────────────────────────────────────────────────────────
exports.generateRegistrationCode = onCall({ cors: true }, async (request) => {
  const { email } = request.data;

  if (!email) {
    throw new HttpsError("invalid-argument", "email es requerido");
  }

  const db = admin.firestore();
  // Usar el email en minúsculas como ID del documento (reemplazando puntos por guiones para evitar problemas)
  const safeEmailId = email.toLowerCase().replace(/\./g, '_');
  const otpRef = db.collection("registrationCodes").doc(safeEmailId);

  // Rate limiting: 60s
  const existing = await otpRef.get();
  if (existing.exists) {
    const data = existing.data();
    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    const secondsSince = (Date.now() - createdAt.getTime()) / 1000;
    if (secondsSince < 60) {
      throw new HttpsError(
        "resource-exhausted",
        `Esperá ${Math.ceil(60 - secondsSince)} segundos antes de pedir un nuevo código.`
      );
    }
  }

  const code = crypto.randomInt(100000, 999999).toString();
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await otpRef.set({
    hashedCode,
    email: email.toLowerCase(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    attempts: 0,
    used: false,
  });

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Código de confirmación de registro 🔐</h2>
    <p style="color:#4b5563;font-size:15px;">Ingresá el siguiente código para validar tu correo y crear tu cuenta en PsicoMatch:</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#f0fdf9,#ede9fe);border:2px solid #14b8a6;border-radius:16px;padding:20px 40px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0f766e;font-family:monospace;">${code}</span>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">⏰ Este código expira en <strong>10 minutos</strong></p>
    <div style="background:#fef2f2;border-left:4px solid #f87171;border-radius:8px;padding:12px 16px;margin-top:20px;">
      <p style="margin:0;color:#991b1b;font-size:13px;">⚠️ <strong>Nunca compartas este código</strong> con nadie. Si no solicitaste este código, ignorá este email.</p>
    </div>
  `);

  try {
    await sendMail({
      to: email,
      subject: `${code} - Código de confirmación PsicoMatch`,
      html,
    });
    return { success: true };
  } catch (err) {
    console.error("❌ Error enviando código de registro:", err);
    await otpRef.delete();
    throw new HttpsError("internal", "No se pudo enviar el código por email.");
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Verificar código de Registro
// ────────────────────────────────────────────────────────────
exports.verifyRegistrationCode = onCall({ cors: true }, async (request) => {
  const { email, code } = request.data;

  if (!email || !code) {
    throw new HttpsError("invalid-argument", "email y code son requeridos");
  }

  const db = admin.firestore();
  const safeEmailId = email.toLowerCase().replace(/\./g, '_');
  const otpRef = db.collection("registrationCodes").doc(safeEmailId);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new HttpsError("not-found", "Código no encontrado o expirado. Solicitá uno nuevo.");
  }

  const data = otpDoc.data();
  if (data.used) {
    await otpRef.delete();
    throw new HttpsError("not-found", "Este código ya fue utilizado.");
  }

  const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
  if (Date.now() > expiresAt.getTime()) {
    await otpRef.delete();
    throw new HttpsError("not-found", "El código expiró. Solicitá uno nuevo.");
  }

  const MAX_ATTEMPTS = 5;
  const attempts = data.attempts || 0;
  if (attempts >= MAX_ATTEMPTS) {
    await otpRef.delete();
    throw new HttpsError("resource-exhausted", "Demasiados intentos fallidos.");
  }

  const inputHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
  if (inputHash !== data.hashedCode) {
    await otpRef.update({ attempts: attempts + 1 });
    const attemptsLeft = MAX_ATTEMPTS - (attempts + 1);
    return { success: false, error: "Código incorrecto", attemptsLeft };
  }

  await otpRef.update({ used: true });
  await otpRef.delete();

  return { success: true };
});

// ────────────────────────────────────────────────────────────
// Callable: Generar y enviar código 2FA (SERVER-SIDE SEGURO)
// ────────────────────────────────────────────────────────────
exports.generate2FACode = onCall({ cors: true }, async (request) => {
  const {uid, email} = request.data;

  if (!uid || !email) {
    throw new HttpsError("invalid-argument", "uid y email son requeridos");
  }

  const db = admin.firestore();
  const otpRef = db.collection("otpCodes").doc(uid);

  // Rate limiting: no permitir nuevo código si el anterior tiene menos de 60s
  const existing = await otpRef.get();
  if (existing.exists) {
    const data = existing.data();
    const createdAt = data.createdAt?.toDate?.() || new Date(0);
    const secondsSince = (Date.now() - createdAt.getTime()) / 1000;
    if (secondsSince < 60) {
      throw new HttpsError(
        "resource-exhausted",
        `Esperá ${Math.ceil(60 - secondsSince)} segundos antes de pedir un nuevo código.`,
        {retryAfterSeconds: Math.ceil(60 - secondsSince)}
      );
    }
  }

  // Generar código de 6 dígitos usando crypto (criptográficamente seguro)
  const code = crypto.randomInt(100000, 999999).toString();

  // Hashear el código con SHA-256 antes de guardarlo
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");

  // Guardar en Firestore con TTL de 10 minutos
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await otpRef.set({
    hashedCode,
    email,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    attempts: 0,
    used: false,
  });

  // Enviar email con el código
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Código de verificación 🔐</h2>
    <p style="color:#4b5563;font-size:15px;">Ingresá el siguiente código para completar tu inicio de sesión en PsicoMatch:</p>
    <div style="text-align:center;margin:32px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg,#f0fdf9,#ede9fe);border:2px solid #14b8a6;border-radius:16px;padding:20px 40px;">
        <span style="font-size:40px;font-weight:800;letter-spacing:12px;color:#0f766e;font-family:monospace;">${code}</span>
      </div>
    </div>
    <p style="color:#6b7280;font-size:13px;text-align:center;">⏰ Este código expira en <strong>10 minutos</strong></p>
    <div style="background:#fef2f2;border-left:4px solid #f87171;border-radius:8px;padding:12px 16px;margin-top:20px;">
      <p style="margin:0;color:#991b1b;font-size:13px;">⚠️ <strong>Nunca compartas este código</strong> con nadie, ni siquiera con el equipo de PsicoMatch. Si no solicitaste este código, ignorá este email.</p>
    </div>
  `);

  try {
    await sendMail({
      to: email,
      subject: `${code} - Tu código de verificación de PsicoMatch`,
      html,
    });
    return {success: true};
  } catch (err) {
    console.error("❌ Error enviando código 2FA:", err);
    // Limpiar el código si no se pudo enviar
    await otpRef.delete();
    throw new HttpsError("internal", "No se pudo enviar el código por email. Verificá que el email sea correcto.");
  }
});

// ────────────────────────────────────────────────────────────
// Callable: Verificar código 2FA (SERVER-SIDE SEGURO)
// ────────────────────────────────────────────────────────────
exports.verify2FACode = onCall({ cors: true }, async (request) => {
  const {uid, code} = request.data;

  if (!uid || !code) {
    throw new HttpsError("invalid-argument", "uid y code son requeridos");
  }

  const db = admin.firestore();
  const otpRef = db.collection("otpCodes").doc(uid);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    throw new HttpsError("not-found", "Código expirado o no encontrado. Solicitá uno nuevo.");
  }

  const data = otpDoc.data();

  // Verificar si ya fue usado
  if (data.used) {
    await otpRef.delete();
    throw new HttpsError("not-found", "Este código ya fue utilizado.");
  }

  // Verificar expiración
  const expiresAt = data.expiresAt?.toDate?.() || new Date(0);
  if (Date.now() > expiresAt.getTime()) {
    await otpRef.delete();
    throw new HttpsError("not-found", "El código expiró. Solicitá uno nuevo.");
  }

  // Control de intentos (máximo 5)
  const MAX_ATTEMPTS = 5;
  const attempts = data.attempts || 0;
  if (attempts >= MAX_ATTEMPTS) {
    await otpRef.delete();
    throw new HttpsError(
      "resource-exhausted",
      "Demasiados intentos fallidos. Por seguridad, tu sesión fue bloqueada."
    );
  }

  // Verificar código (comparar hash)
  const inputHash = crypto.createHash("sha256").update(code.trim()).digest("hex");
  const isValid = inputHash === data.hashedCode;

  if (!isValid) {
    // Incrementar intentos
    await otpRef.update({attempts: attempts + 1});
    const attemptsLeft = MAX_ATTEMPTS - (attempts + 1);
    return {success: false, error: "Código incorrecto", attemptsLeft};
  }

  // Código correcto: marcar como usado y eliminar
  await otpRef.update({used: true});
  await otpRef.delete();

  return {success: true};
});

// ────────────────────────────────────────────────────────────
// Trigger: Notificar nuevo match (mantener compatibilidad)
// ────────────────────────────────────────────────────────────
exports.notifyNewMatch = onDocumentCreated("matches/{matchId}", async (event) => {
  const match = event.data.data();
  const db = admin.firestore();

  const [userDoc, professionalDoc] = await Promise.all([
    db.collection("users").doc(match.userId).get(),
    db.collection("professionals").doc(match.professionalId).get(),
  ]);

  const user = userDoc.data();
  const professional = professionalDoc.data();

  if (user?.email && professional) {
    const html = baseTemplate(`
      <h2 style="color:#111827;font-size:22px;font-weight:700;">¡Encontramos tu match! 🎉</h2>
      <p style="color:#4b5563;">Hemos encontrado un profesional ideal para vos:</p>
      ${infoBox(`
        <p style="margin:0 0 6px;color:#0f766e;font-weight:700;">${professional.fullName || professional.name}</p>
        <p style="margin:0;color:#4b5563;font-size:14px;">Especialidad: ${(professional.specialities || [])[0] || "Psicología General"}</p>
      `)}
      <div style="text-align:center;">${ctaButton(`${APP_URL}/dashboard`, "Ver mi profesional")}</div>
    `);
    await sendMail({to: user.email, subject: "¡Tenemos un profesional perfecto para vos!", html});
  }

  console.log(`✅ Match notificado: ${match.userId} <-> ${match.professionalId}`);
  return null;
});

// ────────────────────────────────────────────────────────────
// Scheduled: Recordatorios de sesión (cada hora)
// ────────────────────────────────────────────────────────────
exports.sendSessionReminders = onSchedule("every 1 hours", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();
  const tomorrow = new Date(now.toDate());
  tomorrow.setHours(tomorrow.getHours() + 24);

  const sessionsSnapshot = await db.collection("sessions")
    .where("scheduledAt", ">", now)
    .where("scheduledAt", "<", admin.firestore.Timestamp.fromDate(tomorrow))
    .where("status", "==", "scheduled")
    .where("reminderSent", "==", false)
    .get();

  const promises = [];
  sessionsSnapshot.forEach((doc) => {
    const session = doc.data();
    promises.push(sendSessionReminderEmail(session.userId, session, "user", db));
    promises.push(sendSessionReminderEmail(session.professionalId, session, "professional", db));
    promises.push(doc.ref.update({reminderSent: true}));
  });

  await Promise.all(promises);
  return null;
});

async function sendSessionReminderEmail(recipientId, session, recipientType, db) {
  const collection = recipientType === "user" ? "users" : "professionals";
  const userDoc = await db.collection(collection).doc(recipientId).get();
  const user = userDoc.data();
  if (!user?.email) return;

  const sessionDate = session.scheduledAt?.toDate?.() || new Date();
  const formattedDate = sessionDate.toLocaleDateString("es-PY", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Asuncion",
  });

  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;">Recordatorio de sesión 📅</h2>
    <p style="color:#4b5563;">Hola <strong>${user.name || user.fullName || "usuario"}</strong>, te recordamos que tenés una sesión programada.</p>
    ${infoBox(`
      <p style="margin:0 0 4px;color:#0f766e;font-weight:600;">Detalles:</p>
      <p style="margin:0 0 4px;color:#4b5563;font-size:14px;">📅 <strong>${formattedDate}</strong></p>
      <p style="margin:0;color:#4b5563;font-size:14px;">⏱️ Duración: 60 minutos</p>
    `)}
    <div style="text-align:center;">${ctaButton(`${APP_URL}/dashboard`, "Ver sesión")}</div>
  `);

  await sendMail({to: user.email, subject: "Recordatorio: Sesión próxima en PsicoMatch 🗓️", html});
}

// ────────────────────────────────────────────────────────────
// Scheduled: Expirar sesiones (diario a las 2 AM)
// ────────────────────────────────────────────────────────────
exports.markExpiredSessions = onSchedule("0 2 * * *", async (event) => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const expiredSnapshot = await db.collection("sessions")
    .where("scheduledAt", "<", now)
    .where("status", "==", "scheduled")
    .get();

  const batch = db.batch();
  expiredSnapshot.forEach((doc) => {
    batch.update(doc.ref, {status: "expired", expiredAt: now});
  });

  if (expiredSnapshot.size > 0) await batch.commit();
  return null;
});

// ────────────────────────────────────────────────────────────
// Callable: Validar profesional (solo admins)
// ────────────────────────────────────────────────────────────
exports.validateProfessional = onCall({ cors: true }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Debes estar autenticado");

  const db = admin.firestore();
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const user = userDoc.data();
  if (!user || user.role !== "admin") {
    throw new HttpsError("permission-denied", "Solo administradores pueden validar profesionales");
  }

  const {professionalId, approved, reason} = request.data;
  if (!professionalId) throw new HttpsError("invalid-argument", "professionalId es requerido");

  const profRef = db.collection("professionals").doc(professionalId);
  await profRef.update({
    isApproved: approved,
    approvedAt: approved ? admin.firestore.FieldValue.serverTimestamp() : null,
    approvedBy: request.auth.uid,
    rejectionReason: approved ? null : reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const profDoc = await profRef.get();
  const professional = profDoc.data();
  if (professional?.email) {
    const subject = approved ? "¡Tu cuenta ha sido aprobada! 🎉" : "Actualización sobre tu registro";
    const html = baseTemplate(approved ? `
      <h2 style="color:#059669;">¡Felicitaciones!</h2>
      <p style="color:#4b5563;">Tu cuenta profesional en PsicoMatch ha sido <strong>aprobada</strong>. Ya podés comenzar a recibir pacientes.</p>
      <div style="text-align:center;">${ctaButton(`${APP_URL}/professional-dashboard`, "Ir a mi Dashboard")}</div>
    ` : `
      <h2 style="color:#d97706;">Actualización de Registro</h2>
      <p style="color:#4b5563;">Lamentablemente, no pudimos aprobar tu cuenta en este momento.</p>
      <p style="color:#4b5563;"><strong>Razón:</strong> ${reason || "No especificada"}</p>
      <p style="color:#6b7280;font-size:14px;">Contactá a soporte para más información.</p>
    `);
    await sendMail({to: professional.email, subject, html});
  }

  return {success: true, message: approved ? "Profesional aprobado" : "Profesional rechazado"};
});

// ────────────────────────────────────────────────────────────
// Callable: Send Push Notification (FCM)
// ────────────────────────────────────────────────────────────
exports.sendPushNotification = onCall({ cors: true }, async (request) => {
  const { title, body, userId } = request.data;

  if (!title || !body || !userId) {
    throw new HttpsError("invalid-argument", "title, body y userId son requeridos");
  }

  // Verificar si el usuario que llama está autenticado
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Debes estar autenticado para enviar notificaciones.");
  }

  const db = admin.firestore();
  
  // Buscar el token FCM del usuario o profesional
  let userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) {
    userDoc = await db.collection("professionals").doc(userId).get();
  }

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "Usuario no encontrado");
  }

  const fcmTokens = userDoc.data().fcmTokens;
  if (!fcmTokens || fcmTokens.length === 0) {
    console.log(`El usuario ${userId} no tiene tokens FCM.`);
    return { success: false, reason: "No FCM token available" };
  }

  const message = {
    notification: {
      title: title,
      body: body
    },
    tokens: fcmTokens
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("Notificación push enviada exitosamente:", response);
    
    // Limpiar tokens inválidos si hay fallos
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(fcmTokens[idx]);
        }
      });
      
      // Remover los tokens fallidos de la BD
      if (failedTokens.length > 0) {
        if (userDoc.ref.path.startsWith("users/")) {
          await db.collection("users").doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
          });
        } else {
          await db.collection("professionals").doc(userId).update({
            fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
          });
        }
      }
    }

    return { success: true, response };
  } catch (error) {
    console.error("Error enviando notificación push:", error);
    throw new HttpsError("internal", "No se pudo enviar la notificación push.");
  }
});

// ────────────────────────────────────────────────────────────
// Centralized Email Notifications (Migrated from EmailJS)
// ────────────────────────────────────────────────────────────

exports.sendProfessionalVerificationEmail = onCall({ cors: true }, async (request) => {
  const { email, name, isApproved, accessCode } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  
  const statusText = isApproved ? "Aprobado" : "Rechazado";
  const title = `Estado de tu solicitud: ${statusText}`;
  const subject = `PsicoMatch - Tu solicitud ha sido ${statusText.toLowerCase()}`;
  
  let contentHtml = `
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${name || "Profesional"} 👋</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">Te informamos que tu solicitud para formar parte de PsicoMatch ha sido <strong>${statusText.toLowerCase()}</strong>.</p>
  `;

  if (isApproved) {
    contentHtml += infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">¡Bienvenido a la plataforma!</p>
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">Tu código de acceso único es: <strong>${accessCode}</strong></p>
      <p style="margin:8px 0 0;color:#4b5563;font-size:14px;line-height:1.6;">Usa este código junto con tu correo para acceder al panel de profesionales.</p>
    `);
    contentHtml += `<div style="text-align:center;">${ctaButton(`${APP_URL}/professional/login`, "Acceder al Panel")}</div>`;
  } else {
    contentHtml += infoBox(`
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">Lamentablemente, no cumples con los requisitos en este momento. Si tienes dudas, contáctanos.</p>
    `);
  }

  const html = baseTemplate(contentHtml);
  
  try {
    await sendMail({ to: email, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending professional verification email:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendProfessionalStatusEmail = onCall({ cors: true }, async (request) => {
  const { email, name, status, reason } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Actualización del estado de tu cuenta`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${name || "Profesional"}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">El estado de tu cuenta en PsicoMatch ha sido actualizado a: <strong>${status}</strong>.</p>
    ${infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">Motivo / Detalles:</p>
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">${reason || "No especificado."}</p>
    `)}
    <p style="color:#9ca3af;font-size:13px;margin-top:32px;">Si crees que esto es un error, por favor contacta con el soporte.</p>
  `);

  try {
    await sendMail({ to: email, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending status email:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendProfessionalAccessCodeEmail = onCall({ cors: true }, async (request) => {
  const { email, name, accessCode } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Tu código de acceso profesional`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${name || "Profesional"} 👋</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">Aquí tienes tu código de acceso para ingresar a tu panel de profesional en PsicoMatch.</p>
    ${infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">Código de acceso:</p>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#111827;letter-spacing:2px;text-align:center;padding:10px 0;">${accessCode}</p>
    `)}
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/professional/login`, "Acceder al Panel")}
    </div>
  `);

  try {
    await sendMail({ to: email, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending access code email:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendProfessionalLoginEmail = onCall({ cors: true }, async (request) => {
  const { email, name, loginTime } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Nuevo inicio de sesión`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${name || "Profesional"}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">Se ha registrado un nuevo inicio de sesión en tu cuenta de PsicoMatch.</p>
    ${infoBox(`
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">Fecha y hora: <strong>${loginTime}</strong></p>
    `)}
    <p style="color:#9ca3af;font-size:13px;margin-top:32px;">Si no fuiste tú, te recomendamos cambiar tus credenciales de acceso o contactarnos inmediatamente.</p>
  `);

  try {
    await sendMail({ to: email, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending login email:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendSessionNotification = onCall({ cors: true }, async (request) => {
  const { toEmail, toName, sessionType, message, details } = request.data;
  if (!toEmail) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Actualización de tu sesión`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${toName || "Usuario"}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">${message}</p>
    ${details ? infoBox(`
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">${details}</p>
    `) : ''}
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/dashboard`, "Ir a mi Panel")}
    </div>
  `);

  try {
    await sendMail({ to: toEmail, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending session notification:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendRatingNotificationEmail = onCall({ cors: true }, async (request) => {
  const { toEmail, toName, rating, message } = request.data;
  if (!toEmail) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Has recibido una nueva calificación`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${toName || "Profesional"}</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">${message}</p>
    ${infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">Calificación recibida:</p>
      <p style="margin:0;font-size:24px;font-weight:bold;color:#f59e0b;text-align:center;padding:10px 0;">⭐ ${rating} / 5</p>
    `)}
    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/professional/dashboard`, "Ir a mi Panel")}
    </div>
  `);

  try {
    await sendMail({ to: toEmail, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending rating notification:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

exports.sendProfessionalRegistrationReceivedEmail = onCall({ cors: true }, async (request) => {
  const { email, name } = request.data;
  if (!email) throw new HttpsError("invalid-argument", "Email is required.");
  
  const subject = `PsicoMatch - Tu registro ha sido recibido`;
  
  const html = baseTemplate(`
    <h2 style="color:#111827;font-size:22px;font-weight:700;margin-bottom:8px;">Hola, ${name || "Profesional"} 👋</h2>
    <p style="color:#4b5563;font-size:15px;line-height:1.6;">Hemos recibido correctamente tu solicitud de registro en PsicoMatch.</p>
    ${infoBox(`
      <p style="margin:0;font-weight:600;color:#0f766e;margin-bottom:8px;">¿Qué sigue ahora?</p>
      <p style="margin:0;color:#4b5563;font-size:14px;line-height:1.6;">Nuestro equipo revisará tu perfil para validar tus datos. Te notificaremos por correo electrónico una vez que tu cuenta sea aprobada y te brindaremos tu código de acceso para ingresar a la plataforma.</p>
    `)}
    <p style="color:#4b5563;font-size:15px;line-height:1.6;margin-top:20px;">Gracias por querer formar parte de PsicoMatch.</p>
  `);

  try {
    await sendMail({ to: email, subject, html });
    return { success: true };
  } catch (err) {
    console.error("Error sending registration received email:", err);
    throw new HttpsError("internal", "Error sending email");
  }
});

