import { 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  setDoc 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { sendSessionRatingNotification, sendRatingNotification } from './emailService';

// Crear una nueva sesión de usuario
export const createUserSession = async (userId, professionalId, sessionType = 'evaluation', scheduledDate = null, scheduledTime = null, meetingType = null) => {
  try {
    console.log('🔄 Creando nueva sesión para usuario:', userId);
    
    const sessionId = `session_${userId}_${Date.now()}`;
    const startTime = serverTimestamp();
    
    // Convertir fecha y hora a Timestamp si se proporcionan
    let scheduledDateTime = null;
    if (scheduledDate && scheduledTime) {
      const [year, month, day] = scheduledDate.split('-').map(Number);
      const [hours, minutes] = scheduledTime.split(':').map(Number);
      scheduledDateTime = new Date(year, month - 1, day, hours, minutes);
    }
    
    const sessionData = {
      id: sessionId,
      userId: userId,
      professionalId: professionalId,
      sessionType: sessionType,
      status: 'scheduled', // Cambiar a 'scheduled' para sesiones programadas
      startTime: startTime,
      scheduledDate: scheduledDate || null,
      scheduledTime: scheduledTime || null,
      scheduledDateTime: scheduledDateTime ? scheduledDateTime : null,
      meetingType: meetingType, // Puede ser 'virtual', 'presencial' o null
      meetingLink: null, // Enlace de Meet/Zoom (si es virtual)
      meetingLocation: null, // Ubicación de la clínica (si es presencial)
      endTime: null,
      duration: 0,
      rating: 0,
      notes: 'none',
      createdAt: startTime,
      requiresPatientChoice: meetingType === null // Si no se provee, el paciente debe elegir
    };
    
    const docRef = await addDoc(collection(db, 'userSessions'), sessionData);
    
    console.log('✅ Sesión creada con ID:', docRef.id);
    return { success: true, sessionId: docRef.id, startTime };
    
  } catch (error) {
    console.error('❌ Error al crear sesión:', error);
    return { success: false, error: error.message };
  }
};

// Finalizar una sesión de usuario
export const endUserSession = async (sessionId, rating = 0, notes = 'none') => {
  try {
    console.log('🔄 Finalizando sesión:', sessionId);
    
    const endTime = serverTimestamp();
    
    // Obtener la sesión para calcular la duración
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const sessionData = sessionDoc.data();
    const startTime = sessionData.startTime;
    
    // Calcular duración (en minutos)
    let duration = 0;
    if (startTime && endTime) {
      const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
      const end = endTime.toDate ? endTime.toDate() : new Date(endTime);
      duration = Math.round((end - start) / (1000 * 60)); // Convertir a minutos
    }
    
    await updateDoc(sessionRef, {
      status: 'completed',
      endTime: endTime,
      duration: duration,
      rating: rating,
      notes: notes
    });
    
    console.log('✅ Sesión finalizada:', sessionId, 'Duración:', duration, 'minutos');
    return { success: true, duration };
    
  } catch (error) {
    console.error('❌ Error al finalizar sesión:', error);
    return { success: false, error: error.message };
  }
};

// Obtener sesiones de un usuario
export const getUserSessions = async (userId) => {
  try {
    console.log('🔄 Obteniendo sesiones para usuario:', userId);
    
    const sessionsRef = collection(db, 'userSessions');
    
    // Obtenemos las sesiones sin ordenar en Firestore porque requiere un índice compuesto
    const q = query(
      sessionsRef,
      where('userId', '==', userId)
    );
    
    const querySnapshot = await getDocs(q);
    
    const sessions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id
      };
    }).sort((a, b) => {
      // Ordenar en el cliente
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return bDate - aDate;
    });
    
    console.log('✅ Sesiones obtenidas:', sessions.length);
    return { success: true, sessions };
    
  } catch (error) {
    console.error('❌ Error al obtener sesiones:', error);
    return { success: false, error: error.message };
  }
};

// Obtener sesiones de un profesional
export const getProfessionalSessions = async (professionalId) => {
  try {
    console.log('🔄 Obteniendo sesiones para profesional:', professionalId);
    
    const sessionsRef = collection(db, 'userSessions');
    const q = query(
      sessionsRef,
      where('professionalId', '==', professionalId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    
    const sessions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id // ID del documento de Firestore (tiene prioridad sobre el campo id dentro del documento)
      };
    });
    
    console.log('✅ Sesiones del profesional obtenidas:', sessions.length);
    return { success: true, sessions };
    
  } catch (error) {
    console.error('❌ Error al obtener sesiones del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar rating de una sesión
export const updateSessionRating = async (sessionId, rating, notes = 'none') => {
  try {
    console.log('🔄 Actualizando rating de sesión:', sessionId);
    
    const sessionRef = doc(db, 'userSessions', sessionId);
    await updateDoc(sessionRef, {
      rating: rating,
      notes: notes
    });
    
    console.log('✅ Rating actualizado:', rating);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al actualizar rating:', error);
    return { success: false, error: error.message };
  }
};

// Escuchar sesiones de un profesional en tiempo real
export const listenProfessionalSessions = (professionalId, callback) => {
  const sessionsRef = collection(db, 'userSessions');
  const q = query(
    sessionsRef,
    where('professionalId', '==', professionalId)
  );

  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id // ID del documento de Firestore (tiene prioridad sobre el campo id dentro del documento)
      };
    }).sort((a, b) => {
      const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return bDate - aDate;
    });
    callback(sessions);
  });
};

// Escuchar sesiones de un usuario en tiempo real
export const listenUserSessions = (userId, callback) => {
  const sessionsRef = collection(db, 'userSessions');
  const q = query(
    sessionsRef,
    where('userId', '==', userId)
  );

  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id // ID del documento de Firestore (tiene prioridad sobre el campo id dentro del documento)
      };
    }).sort((a, b) => {
      const aDate = (a.createdAt || a.updatedAt)?.toDate ? (a.createdAt || a.updatedAt).toDate() : new Date(a.createdAt || a.updatedAt);
      const bDate = (b.createdAt || b.updatedAt)?.toDate ? (b.createdAt || b.updatedAt).toDate() : new Date(b.createdAt || b.updatedAt);
      return bDate - aDate;
    });
    callback(sessions);
  }, (error) => {
    console.error('❌ Error escuchando sesiones del usuario:', error);
    // En caso de error, llamar callback con array vacío
    callback([]);
  });
};

// Actualizar progreso o estado de una sesión
export const updateSessionProgress = async (sessionId, data) => {
  try {
    // Verificar que el documento existe antes de actualizar
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada para actualizar:', sessionId);
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    await updateDoc(sessionRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error al actualizar progreso de sesión:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar el tipo de reunión elegido por el paciente
export const updateMeetingType = async (sessionId, meetingType) => {
  try {
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada:', sessionId);
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    await updateDoc(sessionRef, {
      meetingType: meetingType,
      requiresPatientChoice: false,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Tipo de reunión actualizado:', meetingType);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al actualizar tipo de reunión:', error);
    return { success: false, error: error.message };
  }
};

// Enviar detalles de la reunión (enlace o ubicación) por el profesional
export const sendMeetingDetails = async (sessionId, meetingLink = null, meetingLocation = null) => {
  try {
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada:', sessionId);
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const sessionData = sessionDoc.data();
    const meetingType = sessionData.meetingType;
    
    if (!meetingType) {
      return { success: false, error: 'El paciente aún no ha elegido el tipo de reunión' };
    }
    
    const updateData = {
      updatedAt: serverTimestamp()
    };
    
    if (meetingType === 'virtual' && meetingLink) {
      updateData.meetingLink = meetingLink;
    } else if (meetingType === 'presencial' && meetingLocation) {
      updateData.meetingLocation = meetingLocation;
    } else {
      return { success: false, error: 'Tipo de reunión no coincide con los datos proporcionados' };
    }
    
    await updateDoc(sessionRef, updateData);
    
    console.log('✅ Detalles de reunión enviados');
    return { success: true, sessionData: { ...sessionData, ...updateData } };
  } catch (error) {
    console.error('❌ Error al enviar detalles de reunión:', error);
    return { success: false, error: error.message };
  }
};

// Finalizar sesión para profesionales con motivo
export const completeSessionByProfessional = async (sessionId, reason = '', notes = '', progressOverride = null) => {
  try {
    const endTime = serverTimestamp();
    const sessionRef = doc(db, 'userSessions', sessionId);
    
    // Obtener la sesión para calcular la duración
    const sessionDoc = await getDoc(sessionRef);
    if (!sessionDoc.exists()) {
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const sessionData = sessionDoc.data();
    const startTime = sessionData.startTime;
    
    // Calcular duración (en minutos)
    let duration = 0;
    if (startTime) {
      const start = startTime.toDate ? startTime.toDate() : new Date(startTime);
      // Usar fecha actual para calcular duración ya que endTime aún no está guardado
      const end = new Date();
      duration = Math.round((end - start) / (1000 * 60)); // Convertir a minutos
      if (duration < 0) duration = 0; // Asegurar que no sea negativo
      if (isNaN(duration)) duration = 0; // Asegurar que no sea NaN
    }
    
    // Asegurar que notes no sea undefined, pero no guardar 'none'
    const finalNotes = notes && notes.trim() !== '' ? notes : '';
    
    // Determinar el progreso: si es emergencia o reagendada, usar 0%, sino usar el override o 100%
    let finalProgress = 100;
    if (progressOverride !== null) {
      finalProgress = progressOverride;
    } else if (reason && (reason.toLowerCase().includes('emergencia') || reason.toLowerCase().includes('reagendada'))) {
      finalProgress = 0;
    }
    
    await updateDoc(sessionRef, {
      status: 'completed',
      endTime,
      duration: duration,
      endedBy: 'professional',
      endReason: reason || 'finalizada por el profesional',
      notes: finalNotes,
      updatedAt: endTime,
      progress: finalProgress // Usar el progreso determinado
    });
    
    console.log('✅ Sesión finalizada:', sessionId, 'Duración:', duration, 'minutos', 'Status: completed', `Progress: ${finalProgress}%`);
    return { success: true, duration, progress: finalProgress };
  } catch (error) {
    console.error('❌ Error al finalizar sesión por profesional:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar estado y progreso del paciente (en el doc de usuario)
export const updateUserCareStatus = async (userId, data) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...data,
      careUpdatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('❌ Error al actualizar estado de atención del usuario:', error);
    return { success: false, error: error.message };
  }
};

// Guardar progreso de sesión en userTestResults
export const saveSessionProgress = async (sessionData) => {
  try {
    const { userId, sessionId, professionalId, sessionType, duration, notes, rating = 0, startTime, endTime, progress = null } = sessionData;
    
    // Obtener la sesión completa para asegurar que tenemos todos los datos
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada para guardar progreso:', sessionId);
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const fullSessionData = sessionDoc.data();
    
    // Usar el ID del documento de Firestore
    const finalSessionId = sessionDoc.id;
    
    // Calcular porcentaje basado en el progreso de la sesión o en la calificación
    // Si la sesión tiene progreso definido (puede ser 0% para emergencia/reagendada), usarlo
    // Si hay calificación, usar eso. Si no, usar el progreso de la sesión o 100% por defecto
    const finalRating = rating || fullSessionData.rating || 0;
    const sessionProgress = progress !== null 
      ? progress 
      : (fullSessionData.progress !== undefined ? fullSessionData.progress : null);
    
    let percentage = 100; // Por defecto 100% si la sesión está completada
    
    // Si la sesión tiene progreso definido (incluyendo 0%), usarlo
    if (sessionProgress !== null && sessionProgress !== undefined) {
      percentage = sessionProgress;
    } else if (finalRating > 0) {
      // Si hay calificación y no hay progreso definido, calcular porcentaje basado en eso
      percentage = Math.round((finalRating / 5) * 100);
    }
    
    // Limpiar notas - no guardar 'none', dejar vacío si no hay contenido
    const cleanNotes = (notesValue) => {
      if (!notesValue || notesValue === 'none' || notesValue.trim() === '') {
        return '';
      }
      return notesValue;
    };
    
    // Crear documento en userTestResults con formato adaptado
    const progressData = {
      userId: userId || fullSessionData.userId,
      testId: finalSessionId, // Usar sessionId como testId
      testType: sessionType || fullSessionData.sessionType || 'none',
      answer: cleanNotes(notes || fullSessionData.notes),
      score: finalRating,
      maxScore: 5, // Máximo de calificación
      percentage: percentage,
      recommendations: 'none',
      completedAt: endTime || fullSessionData.endTime || serverTimestamp(),
      // Guardar datos completos de la sesión
      sessionData: {
        id: finalSessionId,
        sessionId: finalSessionId,
        professionalId: professionalId || fullSessionData.professionalId,
        sessionType: sessionType || fullSessionData.sessionType,
        duration: duration || fullSessionData.duration || 0,
        startTime: startTime || fullSessionData.startTime,
        endTime: endTime || fullSessionData.endTime,
        notes: cleanNotes(notes || fullSessionData.notes),
        rating: finalRating,
        status: fullSessionData.status || 'completed',
        createdAt: fullSessionData.createdAt,
        endReason: fullSessionData.endReason || 'none'
      }
    };
    
    // Usar sessionId como ID del documento para evitar duplicados
    const progressRef = doc(db, 'userTestResults', finalSessionId);
    await setDoc(progressRef, progressData, { merge: true });
    
    console.log('✅ Progreso de sesión guardado en userTestResults:', finalSessionId, 'Porcentaje:', percentage);
    return { success: true, progressId: finalSessionId };
  } catch (error) {
    console.error('❌ Error al guardar progreso de sesión:', error);
    return { success: false, error: error.message };
  }
};

// Calificar una sesión específica
export const rateSession = async (sessionId, sessionRating, userId = null) => {
  try {
    // sessionId debe ser el ID del documento de Firestore, no el campo id dentro del documento
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada para calificar con ID de documento:', sessionId);
      // Intentar buscar por el campo id si el ID del documento no funciona
      // Esto es un fallback para sesiones antiguas
      try {
        const sessionsRef = collection(db, 'userSessions');
        const q = query(sessionsRef, where('id', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          const foundSessionData = foundDoc.data();
          const foundSessionRef = doc(db, 'userSessions', foundDoc.id);
          await updateDoc(foundSessionRef, {
            sessionRating: sessionRating,
            sessionRatedAt: serverTimestamp()
          });
          
          // Actualizar también en userTestResults usando el ID del documento real
          const progressRef = doc(db, 'userTestResults', foundDoc.id);
          const progressDoc = await getDoc(progressRef);
          if (progressDoc.exists()) {
            await updateDoc(progressRef, {
              'sessionData.sessionRating': sessionRating
            });
          }
          
          // Enviar notificación al profesional
          if (foundSessionData.professionalId) {
            try {
              const professionalRef = doc(db, 'professionals', foundSessionData.professionalId);
              const professionalDoc = await getDoc(professionalRef);
              if (professionalDoc.exists()) {
                const professionalData = professionalDoc.data();
                const userRef = doc(db, 'users', foundSessionData.userId || userId);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                await sendSessionRatingNotification({
                  professionalEmail: professionalData.email,
                  professionalName: professionalData.fullName || professionalData.name,
                  userName: userData?.name || userData?.email || 'Un paciente',
                  rating: sessionRating,
                  sessionType: foundSessionData.sessionType
                });
              }
            } catch (emailError) {
              console.error('❌ Error al enviar notificación de calificación de sesión:', emailError);
            }
          }
          
          console.log('✅ Sesión calificada (encontrada por campo id):', foundDoc.id, 'Rating:', sessionRating);
          return { success: true };
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback de búsqueda:', fallbackError);
      }
      
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const sessionData = sessionDoc.data();
    
    // Actualizar rating de la sesión
    await updateDoc(sessionRef, {
      sessionRating: sessionRating, // Calificación de la sesión
      sessionRatedAt: serverTimestamp()
    });
    
    // Actualizar también en userTestResults usando el ID del documento
    const progressRef = doc(db, 'userTestResults', sessionId);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      await updateDoc(progressRef, {
        'sessionData.sessionRating': sessionRating
      });
    }
    
    // Enviar notificación al profesional
    if (sessionData.professionalId) {
      try {
        const professionalRef = doc(db, 'professionals', sessionData.professionalId);
        const professionalDoc = await getDoc(professionalRef);
        if (professionalDoc.exists()) {
          const professionalData = professionalDoc.data();
          const userRef = doc(db, 'users', sessionData.userId || userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          await sendSessionRatingNotification({
            professionalEmail: professionalData.email,
            professionalName: professionalData.fullName || professionalData.name,
            userName: userData?.name || userData?.email || 'Un paciente',
            rating: sessionRating,
            sessionType: sessionData.sessionType
          });
        }
      } catch (emailError) {
        console.error('❌ Error al enviar notificación de calificación de sesión:', emailError);
      }
    }
    
    console.log('✅ Sesión calificada:', sessionId, 'Rating de sesión:', sessionRating);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al calificar sesión:', error);
    return { success: false, error: error.message };
  }
};

// Calificar al profesional y actualizar su rating promedio
export const rateProfessional = async (sessionId, professionalRating, professionalId, userId = null) => {
  try {
    // sessionId debe ser el ID del documento de Firestore, no el campo id dentro del documento
    const sessionRef = doc(db, 'userSessions', sessionId);
    const sessionDoc = await getDoc(sessionRef);
    
    if (!sessionDoc.exists()) {
      console.warn('⚠️ Sesión no encontrada para calificar profesional con ID de documento:', sessionId);
      // Intentar buscar por el campo id si el ID del documento no funciona
      // Esto es un fallback para sesiones antiguas
      try {
        const sessionsRef = collection(db, 'userSessions');
        const q = query(sessionsRef, where('id', '==', sessionId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const foundDoc = querySnapshot.docs[0];
          const foundSessionData = foundDoc.data();
          const foundSessionRef = doc(db, 'userSessions', foundDoc.id);
          await updateDoc(foundSessionRef, {
            professionalRating: professionalRating,
            professionalRatedAt: serverTimestamp()
          });
          
          // Calcular el promedio del profesional
          const finalProfessionalId = professionalId || foundSessionData.professionalId;
          if (finalProfessionalId) {
            await updateProfessionalRating(finalProfessionalId);
          }
          
          // Actualizar también en userTestResults usando el ID del documento real
          const progressRef = doc(db, 'userTestResults', foundDoc.id);
          const progressDoc = await getDoc(progressRef);
          if (progressDoc.exists()) {
            await updateDoc(progressRef, {
              score: professionalRating,
              percentage: Math.round((professionalRating / 5) * 100),
              'sessionData.professionalRating': professionalRating
            });
          }
          
          // Enviar notificación al profesional
          if (finalProfessionalId) {
            try {
              const professionalRef = doc(db, 'professionals', finalProfessionalId);
              const professionalDoc = await getDoc(professionalRef);
              if (professionalDoc.exists()) {
                const professionalData = professionalDoc.data();
                const userRef = doc(db, 'users', foundSessionData.userId || userId);
                const userDoc = await getDoc(userRef);
                const userData = userDoc.exists() ? userDoc.data() : null;
                
                await sendRatingNotification({
                  professionalEmail: professionalData.email,
                  professionalName: professionalData.fullName || professionalData.name,
                  userName: userData?.name || userData?.email || 'Un paciente',
                  rating: professionalRating,
                  sessionType: foundSessionData.sessionType
                });
              }
            } catch (emailError) {
              console.error('❌ Error al enviar notificación de calificación de profesional:', emailError);
            }
          }
          
          console.log('✅ Profesional calificado (encontrado por campo id):', foundDoc.id, 'Rating:', professionalRating);
          return { success: true };
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback de búsqueda:', fallbackError);
      }
      
      return { success: false, error: 'Sesión no encontrada' };
    }
    
    const sessionData = sessionDoc.data();
    const finalProfessionalId = professionalId || sessionData.professionalId;
    
    // Actualizar rating del profesional en la sesión
    await updateDoc(sessionRef, {
      professionalRating: professionalRating, // Calificación al profesional
      professionalRatedAt: serverTimestamp()
    });
    
    // Calcular el promedio del profesional basado en TODAS sus calificaciones
    if (finalProfessionalId) {
      await updateProfessionalRating(finalProfessionalId);
    }
    
    // Actualizar también en userTestResults
    const progressRef = doc(db, 'userTestResults', sessionId);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      await updateDoc(progressRef, {
        score: professionalRating, // Usar la calificación del profesional como score principal
        percentage: Math.round((professionalRating / 5) * 100),
        'sessionData.professionalRating': professionalRating
      });
    }
    
    // Enviar notificación al profesional
    if (finalProfessionalId) {
      try {
        const professionalRef = doc(db, 'professionals', finalProfessionalId);
        const professionalDoc = await getDoc(professionalRef);
        if (professionalDoc.exists()) {
          const professionalData = professionalDoc.data();
          const userRef = doc(db, 'users', sessionData.userId || userId);
          const userDoc = await getDoc(userRef);
          const userData = userDoc.exists() ? userDoc.data() : null;
          
          await sendRatingNotification({
            professionalEmail: professionalData.email,
            professionalName: professionalData.fullName || professionalData.name,
            userName: userData?.name || userData?.email || 'Un paciente',
            rating: professionalRating,
            sessionType: sessionData.sessionType
          });
        }
      } catch (emailError) {
        console.error('❌ Error al enviar notificación de calificación de profesional:', emailError);
      }
    }
    
    console.log('✅ Profesional calificado:', finalProfessionalId, 'Rating:', professionalRating);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al calificar profesional:', error);
    return { success: false, error: error.message };
  }
};

// Calcular y actualizar el rating promedio del profesional basado en todas sus calificaciones
export const updateProfessionalRating = async (professionalId) => {
  try {
    // Obtener todas las sesiones completadas del profesional que tengan calificación
    const sessionsRef = collection(db, 'userSessions');
    const q = query(
      sessionsRef,
      where('professionalId', '==', professionalId),
      where('status', '==', 'completed')
    );
    
    const querySnapshot = await getDocs(q);
    const ratings = [];
    
    querySnapshot.forEach((doc) => {
      const sessionData = doc.data();
      // Solo contar calificaciones válidas (mayores a 0)
      if (sessionData.professionalRating && sessionData.professionalRating > 0) {
        ratings.push(sessionData.professionalRating);
      }
    });
    
    // Calcular promedio
    let averageRating = 0;
    if (ratings.length > 0) {
      const sum = ratings.reduce((acc, rating) => acc + rating, 0);
      averageRating = sum / ratings.length;
    }
    
    // Actualizar el rating del profesional
    const professionalRef = doc(db, 'professionals', professionalId);
    const profDoc = await getDoc(professionalRef);
    
    if (profDoc.exists()) {
      await updateDoc(professionalRef, {
        rating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
        ratingCount: ratings.length,
        lastRatingAt: serverTimestamp()
      });
      
      console.log('✅ Rating del profesional actualizado:', averageRating, 'basado en', ratings.length, 'calificaciones');
    }
    
    return { success: true, averageRating, count: ratings.length };
  } catch (error) {
    console.error('❌ Error al actualizar rating del profesional:', error);
    return { success: false, error: error.message };
  }
};
