import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProfessionalAuth } from '../contexts/ProfessionalAuthContext';
import { updateProfile } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { logoutProfessional } from '../services/professionalAuthService';
import { listenProfessionalSessions, updateSessionProgress, completeSessionByProfessional, updateUserCareStatus, createUserSession, saveSessionProgress, sendMeetingDetails } from '../services/userSessionsService';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  sendSessionStatusEmail,
  sendNewSessionNotification,
  sendSessionProgressUpdateNotification,
  sendSessionObservationsNotification,
  sendPatientDischargeNotification,
  sendMeetingDetailsNotification
} from '../services/emailService';
import { listenAssignedPatients } from '../services/professionalService';
import ChatButton from '../components/chat/ChatButton';
import ChatContainer from '../components/chat/ChatContainer';
import Modal from '../components/common/Modal';
import { useConversations } from '../hooks/useChat';

const ProfessionalDashboard = () => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPatients: 0,
    averageRating: 0,
    ratingCount: 0
  });
  const [sessions, setSessions] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [closingSessionId, setClosingSessionId] = useState(null);
  const [progressUpdating, setProgressUpdating] = useState(false);
  const [endReasons, setEndReasons] = useState({});
  const [patients, setPatients] = useState([]);
  const [patientProgress, setPatientProgress] = useState({});
  const [dischargeNotes, setDischargeNotes] = useState({});
  const [patientUpdating, setPatientUpdating] = useState(null);
  const [estimatedSessions, setEstimatedSessions] = useState({});
  const [showSessionEstimateModal, setShowSessionEstimateModal] = useState(false);
  const [selectedPatientForEstimate, setSelectedPatientForEstimate] = useState(null);
  const [newEstimatedSessions, setNewEstimatedSessions] = useState('');
  const [showAddSessionsModal, setShowAddSessionsModal] = useState(false);
  const [sessionsToAdd, setSessionsToAdd] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [professionalNotifications, setProfessionalNotifications] = useState([]);
  const [quickCompleteReason, setQuickCompleteReason] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [recentActivities, setRecentActivities] = useState([]);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [selectedPatientForSession, setSelectedPatientForSession] = useState('');
  const [newSessionType, setNewSessionType] = useState('consultation');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [newSessionTime, setNewSessionTime] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [patientToDischarge, setPatientToDischarge] = useState(null);
  const [showSessionHistoryModal, setShowSessionHistoryModal] = useState(false);
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState(null);
  const [patientSessionHistory, setPatientSessionHistory] = useState([]);
  const [editingProfile, setEditingProfile] = useState(false);
  const [showMeetingDetailsModal, setShowMeetingDetailsModal] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [sendingDetails, setSendingDetails] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    fullName: '',
    phone: '',
    bio: '',
    whatsapp: '',
    instagram: '',
    linkedin: '',
    specialities: [],
    exprecienceYears: ''
  });
  const navigate = useNavigate();
  const {
    professionalData,
    loading: authLoading,
    isUserProfessional
  } = useProfessionalAuth();
  const [showChatModal, setShowChatModal] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const profId = professionalData?.id || professionalData?.uid || professionalData?.profId;
  const { conversations } = useConversations(profId);

  // Verificar autenticación y redirigir si es necesario
  useEffect(() => {
    console.log('🔄 ProfessionalDashboard useEffect:', {
      authLoading,
      isUserProfessional,
      professionalData: !!professionalData,
      status: professionalData?.status,
      isVerified: professionalData?.isVerified
    });

    if (!authLoading) {
      if (!isUserProfessional) {
        console.log('❌ Usuario no es profesional, redirigiendo a login');
        navigate('/professional-login');
      } else if (professionalData) {
        // Verificar estado del profesional
        const isActive = professionalData.status === 'active';
        const isVerified = professionalData.isVerified === true;

        console.log('🔍 Verificando estado del profesional:', {
          isActive,
          isVerified,
          status: professionalData.status
        });

        if (!isActive) {
          console.log('❌ Profesional inactivo, redirigiendo a login');
          navigate('/professional-login');
        } else if (!isVerified) {
          console.log('❌ Profesional no verificado, redirigiendo a login');
          navigate('/professional-login');
        } else {
          // Actualizar lastActivityAt para reflejar actividad real
          const profDocId = professionalData.id || professionalData.uid || professionalData.profId;
          if (profDocId) {
            updateDoc(doc(db, 'professionals', profDocId), {
              lastActivityAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }).catch((err) => console.error('❌ Error al actualizar lastActivityAt del profesional:', err));
          }
        }
      }
    }
  }, [authLoading, isUserProfessional, professionalData, navigate]);

  // Actualizar estadísticas cuando cambien los datos del profesional
  useEffect(() => {
    if (professionalData) {
      setStats({
        totalSessions: professionalData.totalSessions || 0,
        totalPatients: professionalData.totalPatients || 0,
        averageRating: professionalData.rating || 0,
        ratingCount: professionalData.ratingCount || 0
      });
    }
  }, [professionalData]);

  // Sesiones en tiempo real para el profesional
  useEffect(() => {
    if (!professionalData) return;
    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (!profId) return;

    const unsubscribe = listenProfessionalSessions(profId, (liveSessions) => {
      setSessions(liveSessions);
      setSessionLoading(false);
      setStats(prev => ({
        ...prev,
        totalSessions: liveSessions.length
      }));

      // Actualizar notificaciones basadas en cambios en las sesiones
      updateProfessionalNotifications(liveSessions);
    });

    return () => unsubscribe && unsubscribe();
  }, [professionalData, patients]);

  // Cargar notificaciones leídas desde localStorage
  const getReadNotifications = () => {
    if (!professionalData) return new Set();
    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (!profId) return new Set();
    try {
      const stored = localStorage.getItem(`professional_read_notifications_${profId}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error al cargar notificaciones leídas:', error);
      return new Set();
    }
  };

  // Guardar notificaciones leídas en localStorage
  const saveReadNotifications = (readIds) => {
    if (!professionalData) return;
    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (!profId) return;
    try {
      localStorage.setItem(`professional_read_notifications_${profId}`, JSON.stringify(Array.from(readIds)));
    } catch (error) {
      console.error('Error al guardar notificaciones leídas:', error);
    }
  };

  // Función para actualizar notificaciones del profesional
  const updateProfessionalNotifications = (sessionsList) => {
    const readNotifications = getReadNotifications();
    setProfessionalNotifications(prev => {
      const newNotifications = [];

      sessionsList.forEach(session => {
        const patient = patientMap[session.userId];
        const patientName = patient?.name || patient?.email || 'Un paciente';

        // Notificación: Paciente eligió tipo de sesión
        if (session.meetingType && session.requiresPatientChoice === false) {
          const notificationId = `session-${session.id}-type-chosen`;
          // Verificar si ya fue leída
          if (!readNotifications.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'meeting_type_chosen',
              title: 'Tipo de sesión elegido',
              message: `${patientName} ha elegido sesión ${session.meetingType === 'virtual' ? 'virtual' : 'presencial'}${session.scheduledDate ? ` para el ${new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES')}` : ''}${session.scheduledTime ? ` a las ${session.scheduledTime}` : ''}. ${session.meetingType === 'virtual' ? 'Por favor, envía el enlace de la reunión.' : 'Por favor, envía la ubicación de la clínica.'}`,
              sessionId: session.id,
              session: session,
              timestamp: session.updatedAt || session.createdAt || new Date(),
              read: false
            });
          }
        }

        // Notificación: Paciente calificó la sesión
        if (session.sessionRating && session.sessionRating > 0 && session.sessionRatedAt) {
          const notificationId = `session-${session.id}-rated`;
          if (!readNotifications.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'session_rated',
              title: 'Sesión calificada',
              message: `${patientName} ha calificado tu sesión con ${session.sessionRating} estrellas.`,
              sessionId: session.id,
              session: session,
              timestamp: session.sessionRatedAt || new Date(),
              read: false
            });
          }
        }

        // Notificación: Paciente calificó al profesional
        if (session.professionalRating && session.professionalRating > 0 && session.professionalRatedAt) {
          const notificationId = `session-${session.id}-professional-rated`;
          if (!readNotifications.has(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'professional_rated',
              title: 'Has sido calificado',
              message: `${patientName} te ha calificado con ${session.professionalRating} estrellas como profesional.`,
              sessionId: session.id,
              session: session,
              timestamp: session.professionalRatedAt || new Date(),
              read: false
            });
          }
        }

        // Notificación: Sesión programada que requiere atención
        if (session.status === 'scheduled' && session.meetingType && !session.meetingLink && !session.meetingLocation) {
          const notificationId = `session-${session.id}-send-details`;
          newNotifications.push({
            id: notificationId,
            type: 'send_meeting_details',
            title: 'Enviar detalles de sesión',
            message: `${patientName} ha elegido sesión ${session.meetingType === 'virtual' ? 'virtual' : 'presencial'}. Por favor, envía ${session.meetingType === 'virtual' ? 'el enlace' : 'la ubicación'}.`,
            sessionId: session.id,
            session: session,
            timestamp: session.updatedAt || session.createdAt || new Date(),
            read: readNotifications.has(notificationId)
          });
        }
      });

      // Ordenar por timestamp (más recientes primero)
      newNotifications.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime - aTime;
      });

      // Combinar con notificaciones existentes que no estén en la nueva lista
      const existingIds = new Set(newNotifications.map(n => n.id));
      const kept = prev.filter(n => !existingIds.has(n.id) && !n.read);
      const combined = [...newNotifications, ...kept].sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime - aTime;
      });

      return combined;
    });
  };

  // Detectar cuando un paciente alcanza 100% de progreso
  useEffect(() => {
    if (sessions.length === 0 || patients.length === 0) return;

    patients.forEach(patient => {
      // Solo verificar pacientes que no estén ya dados de alta
      if (patient.careStatus === 'alta') return;

      const patientSessions = sessions.filter(s => s.userId === patient.id);
      const completedSessions = patientSessions.filter(s => s.status === 'completed').length;
      const estimated = estimatedSessions[patient.id] || 0;

      if (estimated > 0 && completedSessions >= estimated) {
        // Verificar si ya mostramos el modal para este paciente
        if (!showDischargeModal && patientToDischarge?.id !== patient.id) {
          setPatientToDischarge(patient);
          setShowDischargeModal(true);
        }
      }
    });
  }, [sessions, patients, estimatedSessions, showDischargeModal, patientToDischarge]);

  // Pacientes asignados en tiempo real
  useEffect(() => {
    if (!professionalData) return;
    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (!profId) return;

    const unsubscribe = listenAssignedPatients(profId, (assigned) => {
      setPatients(assigned);
      setStats(prev => ({
        ...prev,
        totalPatients: assigned.length
      }));

      // Cargar estimaciones de sesiones desde Firestore
      const loadEstimations = async () => {
        const estimations = {};
        for (const patient of assigned) {
          try {
            const patientDoc = await getDoc(doc(db, 'users', patient.id));
            if (patientDoc.exists()) {
              const data = patientDoc.data();
              if (data.estimatedSessions) {
                estimations[patient.id] = data.estimatedSessions;
              }
            }
          } catch (error) {
            console.error(`Error cargando estimación para paciente ${patient.id}:`, error);
          }
        }
        setEstimatedSessions(prev => ({ ...prev, ...estimations }));
      };

      if (assigned.length > 0) {
        loadEstimations();
      }
    });

    return () => unsubscribe && unsubscribe();
  }, [professionalData]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout de profesional...');
      setShowLogoutModal(false); // Cerrar modal primero
      await logoutProfessional();
      console.log('✅ Logout exitoso, navegando...');
      navigate('/professional-login');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      setShowLogoutModal(false); // Cerrar modal incluso si hay error
    }
  };

  const handleProgressUpdate = async (sessionId, progress) => {
    try {
      setProgressUpdating(true);
      await updateSessionProgress(sessionId, { status: 'in_progress', progress });

      // Notificar al paciente sobre la actualización de progreso
      const session = sessions.find(s => s.id === sessionId);
      if (session && session.userId) {
        const patient = patientMap[session.userId];
        if (patient) {
          try {
            await sendSessionProgressUpdateNotification({
              userEmail: patient.email,
              userName: patient.name || patient.email,
              professionalName: professionalData?.fullName || professionalData?.name,
              progress: progress,
              sessionType: session.sessionType
            });
          } catch (emailError) {
            console.error('❌ Error al enviar notificación de progreso:', emailError);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando progreso:', error);
    } finally {
      setProgressUpdating(false);
    }
  };

  const handleCompleteSession = async (session) => {
    try {
      setClosingSessionId(session.id);
      const reason = endReasons[session.id] || quickCompleteReason || 'Finalizada por el profesional';

      // Determinar si es emergencia o reagendada para establecer progreso 0%
      const isEmergencyOrRescheduled = quickCompleteReason === 'emergencia' ||
        quickCompleteReason === 'reagendada' ||
        reason.toLowerCase().includes('emergencia') ||
        reason.toLowerCase().includes('reagendada');

      const sessionProgress = isEmergencyOrRescheduled ? 0 : null; // null = usar default (100%)

      // Si hay notas, notificar sobre observaciones
      if (sessionNotes && sessionNotes.trim() !== '') {
        await updateSessionProgress(session.id, { notes: sessionNotes });

        // Notificar sobre observaciones
        if (session.userId) {
          const patient = patientMap[session.userId];
          if (patient) {
            try {
              await sendSessionObservationsNotification({
                userEmail: patient.email,
                userName: patient.name || patient.email,
                professionalName: professionalData?.fullName || professionalData?.name,
                sessionType: session.sessionType,
                hasObservations: true
              });
            } catch (emailError) {
              console.error('❌ Error al enviar notificación de observaciones:', emailError);
            }
          }
        }
      }

      // Usar el ID del documento de Firestore (session.id) para finalizar
      const completeResult = await completeSessionByProfessional(session.id, reason, sessionNotes, sessionProgress);

      if (!completeResult.success) {
        toast.error(`Error al finalizar la sesión: ${completeResult.error || 'Error desconocido'}`);
        return;
      }

      // Guardar progreso en userTestResults
      if (session.userId) {
        try {
          const profId = professionalData.id || professionalData.uid || professionalData.profId;
          // Obtener la sesión actualizada para tener todos los datos
          const updatedSessionDoc = await getDoc(doc(db, 'userSessions', session.id));
          if (updatedSessionDoc.exists()) {
            const updatedSessionData = updatedSessionDoc.data();

            // Asegurar que tenemos la duración calculada
            const finalDuration = completeResult.duration || updatedSessionData.duration || 0;

            // Solo guardar notas si hay contenido, de lo contrario dejar vacío
            const finalNotes = sessionNotes && sessionNotes.trim() !== ''
              ? sessionNotes
              : (updatedSessionData.notes && updatedSessionData.notes !== 'none' && updatedSessionData.notes.trim() !== ''
                ? updatedSessionData.notes
                : '');

            // Obtener el progreso de la sesión finalizada
            const sessionProgressValue = completeResult.progress !== undefined
              ? completeResult.progress
              : (updatedSessionData.progress !== undefined ? updatedSessionData.progress : null);

            const saveResult = await saveSessionProgress({
              userId: session.userId,
              sessionId: session.id, // ID del documento de Firestore
              professionalId: profId,
              sessionType: updatedSessionData.sessionType || session.sessionType || 'consultation',
              duration: finalDuration,
              notes: finalNotes,
              rating: updatedSessionData.rating || session.rating || 0,
              startTime: updatedSessionData.startTime || session.startTime,
              endTime: updatedSessionData.endTime,
              progress: sessionProgressValue // Pasar el progreso de la sesión
            });

            if (saveResult.success) {
              console.log('✅ Progreso guardado exitosamente');
            } else {
              console.warn('⚠️ Error al guardar progreso:', saveResult.error);
            }
          } else {
            console.warn('⚠️ No se pudo obtener la sesión actualizada para guardar progreso');
          }
        } catch (progressError) {
          console.error('❌ Error al guardar progreso:', progressError);
          // No bloquear si falla el guardado de progreso, pero loguear el error
        }
      }

      // Notificar al usuario vía email sobre finalización
      if (session.userId) {
        const userDoc = await getDoc(doc(db, 'users', session.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          try {
            await sendSessionStatusEmail({
              userEmail: userData.email,
              userName: userData.name,
              professionalName: professionalData?.fullName || professionalData?.name,
              status: 'finalizada',
              reason
            });
          } catch (emailError) {
            console.error('❌ Error al enviar notificación de finalización:', emailError);
          }
        }
      }

      toast.success('Sesión finalizada exitosamente. El paciente ha sido notificado.');

      // El useEffect detectará automáticamente cuando se alcance el 100% y mostrará el modal

      // Limpiar el modal
      setSelectedSession(null);
      setSessionNotes('');
      setQuickCompleteReason('');
      setEndReasons(prev => {
        const newReasons = { ...prev };
        delete newReasons[session.id];
        return newReasons;
      });
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      toast.error('Error al finalizar la sesión');
    } finally {
      setClosingSessionId(null);
    }
  };

  const handleSavePatientProgress = async (patientId) => {
    try {
      setPatientUpdating(patientId);
      const progress = patientProgress[patientId] || 'En seguimiento';

      // Calcular progreso basado en sesiones completadas vs estimadas
      const patientSessions = sessions.filter(s => s.userId === patientId);
      const completedSessions = patientSessions.filter(s => s.status === 'completed').length;
      const estimated = estimatedSessions[patientId] || 0;
      let progressPercentage = 0;

      if (estimated > 0) {
        progressPercentage = Math.round((completedSessions / estimated) * 100);
        if (progressPercentage > 100) progressPercentage = 100;
      }

      await updateUserCareStatus(patientId, {
        careStatus: 'en_progreso',
        careProgress: progress,
        estimatedSessions: estimated,
        completedSessions: completedSessions,
        progressPercentage: progressPercentage,
        careUpdatedBy: professionalData?.id || professionalData?.uid || professionalData?.profId || 'unknown'
      });

      // Limpiar el campo de texto después de guardar
      setPatientProgress(prev => {
        const updated = { ...prev };
        updated[patientId] = '';
        return updated;
      });

      toast.success('Notas de seguimiento guardadas exitosamente');
    } catch (error) {
      console.error('❌ Error al actualizar progreso del paciente:', error);
      toast.error('Error al actualizar el progreso del paciente');
    } finally {
      setPatientUpdating(null);
    }
  };

  const handleEstimateSessions = async () => {
    if (!newEstimatedSessions || isNaN(newEstimatedSessions) || parseInt(newEstimatedSessions) <= 0) {
      toast.error('Por favor ingresa un número válido de sesiones');
      return;
    }

    try {
      const patientId = selectedPatientForEstimate?.id;
      if (!patientId) {
        toast.error('Error: No se pudo identificar el paciente');
        return;
      }

      setEstimatedSessions(prev => ({ ...prev, [patientId]: parseInt(newEstimatedSessions) }));

      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', patientId), {
        estimatedSessions: parseInt(newEstimatedSessions),
        estimatedSessionsUpdatedAt: serverTimestamp(),
        estimatedSessionsUpdatedBy: professionalData?.id || professionalData?.uid || professionalData?.profId
      });

      toast.success(`Se estimaron ${newEstimatedSessions} sesiones para este paciente`);
      setShowSessionEstimateModal(false);
      setNewEstimatedSessions('');
      setSelectedPatientForEstimate(null);
    } catch (error) {
      console.error('❌ Error al estimar sesiones:', error);
      toast.error('Error al estimar las sesiones');
    }
  };

  const handleAddSessions = async () => {
    if (!sessionsToAdd || isNaN(sessionsToAdd) || parseInt(sessionsToAdd) <= 0) {
      toast.error('Por favor ingresa un número válido de sesiones');
      return;
    }

    try {
      const patientId = selectedPatientForEstimate?.id;
      if (!patientId) {
        toast.error('Error: No se pudo identificar el paciente');
        return;
      }

      const currentEstimated = estimatedSessions[patientId] || 0;
      const newTotal = currentEstimated + parseInt(sessionsToAdd);

      setEstimatedSessions(prev => ({ ...prev, [patientId]: newTotal }));

      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', patientId), {
        estimatedSessions: newTotal,
        estimatedSessionsUpdatedAt: serverTimestamp(),
        estimatedSessionsUpdatedBy: professionalData?.id || professionalData?.uid || professionalData?.profId
      });

      toast.success(`Se agregaron ${sessionsToAdd} sesiones. Total estimado: ${newTotal}`);
      setShowAddSessionsModal(false);
      setSessionsToAdd('');
      setSelectedPatientForEstimate(null);
    } catch (error) {
      console.error('❌ Error al agregar sesiones:', error);
      toast.error('Error al agregar las sesiones');
    }
  };

  // Función para ver historial completo de sesiones de un paciente
  const handleViewSessionHistory = async (patient) => {
    try {
      setSelectedPatientForHistory(patient);

      // Obtener todas las sesiones del paciente
      const patientSessions = sessions.filter(s => s.userId === patient.id);

      // Ordenar por fecha de creación (más recientes primero)
      const sortedSessions = patientSessions.sort((a, b) => {
        const aDate = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const bDate = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return bDate - aDate;
      });

      setPatientSessionHistory(sortedSessions);
      setShowSessionHistoryModal(true);
    } catch (error) {
      console.error('❌ Error al cargar historial de sesiones:', error);
      toast.error('Error al cargar el historial de sesiones');
    }
  };

  const handleDischargePatient = async (patientId = null) => {
    try {
      const targetPatientId = patientId || (patientToDischarge?.id);
      if (!targetPatientId) {
        toast.error('Error: No se especificó el paciente');
        return;
      }

      setPatientUpdating(targetPatientId);
      const note = dischargeNotes[targetPatientId] || 'Alta médica - Sesiones completadas al 100%';

      await updateUserCareStatus(targetPatientId, {
        careStatus: 'alta',
        careProgress: note,
        careUpdatedBy: professionalData?.id || professionalData?.uid || professionalData?.profId || 'unknown'
      });

      // Notificar al paciente sobre el alta
      const patient = patients.find(p => p.id === targetPatientId) || patientToDischarge;
      if (patient) {
        try {
          await sendPatientDischargeNotification({
            userEmail: patient.email,
            userName: patient.name || patient.email,
            professionalName: professionalData?.fullName || professionalData?.name,
            dischargeNote: note
          });
        } catch (emailError) {
          console.error('❌ Error al enviar notificación de alta:', emailError);
        }
      }

      toast.success('Paciente dado de alta exitosamente. El paciente ha sido notificado.');
      setShowDischargeModal(false);
      setPatientToDischarge(null);
    } catch (error) {
      console.error('❌ Error al dar de alta al paciente:', error);
      toast.error('Error al dar de alta al paciente');
    } finally {
      setPatientUpdating(null);
    }
  };

  const patientMap = patients.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {});

  // Función para obtener estadísticas de sesiones por paciente
  const getPatientSessionStats = (patientId) => {
    const patientSessions = sessions.filter(s => s.userId === patientId);
    return {
      total: patientSessions.length,
      active: patientSessions.filter(s => s.status === 'active' || s.status === 'in_progress').length,
      completed: patientSessions.filter(s => s.status === 'completed').length,
      lastSession: patientSessions.length > 0
        ? patientSessions.sort((a, b) => {
          const aTime = (a.updatedAt || a.createdAt)?.toDate ? (a.updatedAt || a.createdAt).toDate() : new Date(a.updatedAt || a.createdAt);
          const bTime = (b.updatedAt || b.createdAt)?.toDate ? (b.updatedAt || b.createdAt).toDate() : new Date(b.updatedAt || b.createdAt);
          return bTime - aTime;
        })[0]
        : null
    };
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRelativeTime = (date) => {
    if (!date) return 'N/A';
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Hace unos momentos';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`;
    if (diffInHours < 24) return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays} días`;
    return formatDate(date);
  };

  // Cargar actividades recientes
  useEffect(() => {
    if (!professionalData || patients.length === 0) return;
    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (!profId) return;

    const loadRecentActivities = async () => {
      try {
        const activities = [];
        const patientMapLocal = patients.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});

        // Obtener sesiones completadas recientemente (últimas 5)
        try {
          const sessionsRef = collection(db, 'userSessions');
          const completedSessionsQuery = query(
            sessionsRef,
            where('professionalId', '==', profId),
            where('status', '==', 'completed'),
            orderBy('updatedAt', 'desc'),
            limit(5)
          );

          const completedSessionsSnapshot = await getDocs(completedSessionsQuery);
          completedSessionsSnapshot.forEach((docSnap) => {
            const sessionData = docSnap.data();
            const patient = patientMapLocal[sessionData.userId];
            if (patient) {
              activities.push({
                id: `session_${docSnap.id}`,
                type: 'session_completed',
                title: 'Sesión completada',
                description: `Sesión con ${patient.name || patient.email}`,
                timestamp: sessionData.endTime || sessionData.updatedAt || sessionData.createdAt,
                icon: 'check',
                color: 'green'
              });
            }
          });
        } catch (queryError) {
          // Si falla la consulta con orderBy, intentar sin ordenar
          console.warn('⚠️ Error en consulta ordenada, intentando sin orden:', queryError);
          try {
            const sessionsRef = collection(db, 'userSessions');
            const completedSessionsQuery = query(
              sessionsRef,
              where('professionalId', '==', profId),
              where('status', '==', 'completed')
            );

            const completedSessionsSnapshot = await getDocs(completedSessionsQuery);
            const sessionsArray = completedSessionsSnapshot.docs.map(docSnap => ({
              id: docSnap.id,
              ...docSnap.data()
            })).sort((a, b) => {
              const aTime = (a.endTime || a.updatedAt || a.createdAt)?.toDate ? (a.endTime || a.updatedAt || a.createdAt).toDate() : new Date(a.endTime || a.updatedAt || a.createdAt);
              const bTime = (b.endTime || b.updatedAt || b.createdAt)?.toDate ? (b.endTime || b.updatedAt || b.createdAt).toDate() : new Date(b.endTime || b.updatedAt || b.createdAt);
              return bTime - aTime;
            }).slice(0, 5);

            sessionsArray.forEach((sessionData) => {
              const patient = patientMapLocal[sessionData.userId];
              if (patient) {
                activities.push({
                  id: `session_${sessionData.id}`,
                  type: 'session_completed',
                  title: 'Sesión completada',
                  description: `Sesión con ${patient.name || patient.email}`,
                  timestamp: sessionData.endTime || sessionData.updatedAt || sessionData.createdAt,
                  icon: 'check',
                  color: 'green'
                });
              }
            });
          } catch (fallbackError) {
            console.error('❌ Error al obtener sesiones completadas:', fallbackError);
          }
        }

        // Obtener pacientes nuevos (últimos 5 días)
        const recentPatients = patients.filter(patient => {
          if (!patient.createdAt) return false;
          const patientDate = patient.createdAt?.toDate ? patient.createdAt.toDate() : new Date(patient.createdAt);
          const daysDiff = (new Date() - patientDate) / (1000 * 60 * 60 * 24);
          return daysDiff <= 5;
        });

        recentPatients.slice(0, 3).forEach(patient => {
          activities.push({
            id: `patient_${patient.id}`,
            type: 'new_patient',
            title: 'Nuevo paciente',
            description: `${patient.name || patient.email} se registró como paciente`,
            timestamp: patient.createdAt,
            icon: 'user',
            color: 'blue'
          });
        });

        // Ordenar por timestamp y tomar las 5 más recientes
        activities.sort((a, b) => {
          const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return bTime - aTime;
        });

        setRecentActivities(activities.slice(0, 5));
      } catch (error) {
        console.error('❌ Error al cargar actividades recientes:', error);
      }
    };

    loadRecentActivities();
  }, [professionalData, patients]);

  // Handlers para acciones rápidas
  const handleNewSession = () => {
    setShowNewSessionModal(true);
  };

  const handleCreateSession = async () => {
    if (!selectedPatientForSession) {
      toast.error('Por favor selecciona un paciente');
      return;
    }

    // Validar que el paciente esté emparejado con este profesional
    const selectedPatient = patients.find(p => p.id === selectedPatientForSession);
    if (!selectedPatient) {
      toast.error('Error: No se encontró el paciente seleccionado');
      return;
    }

    const profId = professionalData.id || professionalData.uid || professionalData.profId;
    if (selectedPatient.matchedProfessional !== profId) {
      toast.error('Este paciente no está emparejado contigo. Solo puedes crear sesiones con pacientes que han sido emparejados contigo.');
      return;
    }

    if (!newSessionDate) {
      toast.error('Por favor selecciona una fecha para la sesión');
      return;
    }

    if (!newSessionTime) {
      toast.error('Por favor selecciona una hora para la sesión');
      return;
    }

    // Validar que no haya sesiones programadas o activas en la misma fecha/hora
    const scheduledSessions = sessions.filter(
      s => s.userId === selectedPatientForSession &&
        (s.status === 'scheduled' || s.status === 'active' || s.status === 'in_progress') &&
        s.scheduledDate === newSessionDate &&
        s.scheduledTime === newSessionTime
    );

    if (scheduledSessions.length > 0) {
      toast.error('Ya existe una sesión programada para esta fecha y hora.');
      return;
    }

    try {
      setCreatingSession(true);
      const result = await createUserSession(selectedPatientForSession, profId, newSessionType, newSessionDate, newSessionTime);

      if (result.success) {
        // Notificar al paciente
        try {
          await sendNewSessionNotification({
            userEmail: selectedPatient.email,
            userName: selectedPatient.name || selectedPatient.email,
            professionalName: professionalData?.fullName || professionalData?.name,
            sessionType: newSessionType,
            scheduledDate: newSessionDate,
            scheduledTime: newSessionTime
          });
        } catch (emailError) {
          console.error('❌ Error al enviar notificación:', emailError);
          // No bloquear la creación si falla el email
        }

        toast.success('Sesión creada exitosamente. El paciente ha sido notificado y debe elegir el tipo de reunión.');
        setShowNewSessionModal(false);
        setSelectedPatientForSession('');
        setNewSessionType('consultation');
        setNewSessionDate('');
        setNewSessionTime('');
      } else {
        toast.error(`Error al crear sesión: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error al crear sesión:', error);
      toast.error('Error al crear la sesión');
    } finally {
      setCreatingSession(false);
    }
  };

  const handleViewReports = () => {
    setShowReportsModal(true);
  };

  const handleViewPatients = () => {
    const patientsSection = document.getElementById('patients-section');
    if (patientsSection) {
      patientsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Función para enviar detalles de la reunión (enlace o ubicación)
  const handleSendMeetingDetails = async () => {
    if (!selectedSessionForDetails) return;

    const session = selectedSessionForDetails;

    if (session.meetingType === 'virtual' && !meetingLink.trim()) {
      toast.error('Por favor ingresa el enlace de la reunión');
      return;
    }

    if (session.meetingType === 'presencial' && !meetingLocation.trim()) {
      toast.error('Por favor ingresa la ubicación de la clínica');
      return;
    }

    try {
      setSendingDetails(true);
      const result = await sendMeetingDetails(
        session.id,
        session.meetingType === 'virtual' ? meetingLink : null,
        session.meetingType === 'presencial' ? meetingLocation : null
      );

      if (result.success) {
        // Obtener datos del paciente para la notificación
        const patient = patientMap[session.userId];
        if (patient) {
          try {
            await sendMeetingDetailsNotification({
              userEmail: patient.email,
              userName: patient.name || patient.email,
              professionalName: professionalData?.fullName || professionalData?.name,
              sessionType: session.sessionType,
              meetingType: session.meetingType,
              meetingLink: session.meetingType === 'virtual' ? meetingLink : null,
              meetingLocation: session.meetingType === 'presencial' ? meetingLocation : null,
              scheduledDate: session.scheduledDate,
              scheduledTime: session.scheduledTime
            });
          } catch (emailError) {
            console.error('❌ Error al enviar notificación:', emailError);
          }
        }

        toast.success('Detalles de la sesión enviados exitosamente. El paciente ha sido notificado.');
        setShowMeetingDetailsModal(false);
        setSelectedSessionForDetails(null);
        setMeetingLink('');
        setMeetingLocation('');
      } else {
        toast.error(result.error || 'Error al enviar los detalles');
      }
    } catch (error) {
      console.error('❌ Error al enviar detalles:', error);
      toast.error('Error al enviar los detalles de la sesión');
    } finally {
      setSendingDetails(false);
    }
  };

  const handleSettings = () => {
    setShowSettingsModal(true);
  };

  // Especialidades disponibles (mismas que en el registro)
  const availableSpecialities = [
    'Ansiedad (Cognitivo-Conductual)',
    'Depresión (Cognitivo-Conductual)',
    'Estrés (Mindfulness)',
    'Trauma (EMDR)',
    'Pareja (Sistémica)',
    'Familiar (Sistémica)',
    'Infantil (Lúdica)',
    'Adolescentes (Cognitivo-Conductual)',
    'Adultos (Humanista)',
    'TOC (Cognitivo-Conductual)',
    'Fobias (Exposición)',
    'Duelo (Humanista)',
    'Adicciones (Cognitivo-Conductual)',
    'Autoestima (Humanista)',
    'Desarrollo personal (Humanista)',
    'Crisis existencial (Humanista)',
    'Problemas laborales (Cognitivo-Conductual)',
    'Problemas académicos (Cognitivo-Conductual)',
    'Trastornos alimentarios (Cognitivo-Conductual)',
    'Trastornos del sueño (Cognitivo-Conductual)',
    'Neuropsicología (Evaluación)',
    'Psicología Forense (Evaluación)',
    'Otra'
  ];

  const handleSpecialityToggle = (speciality) => {
    setProfileFormData(prev => ({
      ...prev,
      specialities: prev.specialities.includes(speciality)
        ? prev.specialities.filter(s => s !== speciality)
        : [...prev.specialities, speciality]
    }));
  };

  const handleProfileInputChange = (e) => {
    const { name, value } = e.target;
    setProfileFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStartChatWithPatient = async (patientId) => {
    try {
      if (!patientId) {
        toast.error('ID de paciente inválido');
        return;
      }

      const chatService = (await import('../services/chatService')).default;
      const profId = professionalData?.id || professionalData?.uid || professionalData?.profId;

      const existingConv = conversations?.find(
        c => c.userId === patientId || c.participants?.includes(patientId)
      );

      if (existingConv) {
        setActiveChatId(existingConv.id);
      } else {
        const patient = patients.find(p => p.id === patientId);
        const newConvId = await chatService.createConversation(
          patientId,
          profId,
          patient?.name || 'Paciente',
          professionalData?.fullName || professionalData?.displayName || 'Profesional'
        );
        setActiveChatId(newConvId);
        toast.success('Conversación iniciada');
      }

      setShowChatModal(true);
    } catch (error) {
      console.error('Error al iniciar chat:', error);
      toast.error('Error al iniciar el chat');
    }
  };

  const handleSaveProfile = async () => {
    try {
      setEditingProfile(true);
      const profId = professionalData.id || professionalData.uid || professionalData.profId;

      if (!profId) {
        toast.error('Error: No se pudo identificar el ID del profesional');
        return;
      }

      // Preparar datos de actualización
      const updateData = {
        fullName: profileFormData.fullName,
        bio: profileFormData.bio,
        exprecienceYears: profileFormData.exprecienceYears,
        specialities: profileFormData.specialities,
        // También actualizar speciality si existe (para compatibilidad)
        speciality: profileFormData.specialities.length > 0 ? profileFormData.specialities[0] : professionalData?.speciality,
        contact: {
          ...professionalData?.contact,
          phone: profileFormData.phone,
          whatsapp: profileFormData.whatsapp,
          instagram: profileFormData.instagram,
          linkedin: profileFormData.linkedin
        },
        updatedAt: serverTimestamp(),
        updatedBy: profId
      };

      // Actualizar en Firestore
      await updateDoc(doc(db, 'professionals', profId), updateData);

      // Actualizar también el perfil de Firebase Auth si el nombre cambió
      if (profileFormData.fullName && auth.currentUser) {
        try {
          await updateProfile(auth.currentUser, {
            displayName: profileFormData.fullName
          });
        } catch (authError) {
          console.warn('⚠️ Error al actualizar perfil de Auth:', authError);
          // No bloquear si falla la actualización de Auth
        }
      }

      toast.success('Perfil actualizado exitosamente');
      setShowEditProfileModal(false);

      // Recargar la página para reflejar los cambios
      window.location.reload();
    } catch (error) {
      console.error('❌ Error al actualizar perfil:', error);
      toast.error(`Error al actualizar el perfil: ${error.message}`);
    } finally {
      setEditingProfile(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando panel profesional...</p>
        </div>
      </div>
    );
  }

  if (!professionalData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">No se pudieron cargar los datos del profesional</p>
            <button
              onClick={() => navigate('/professional-login')}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Psicomatch
              </span>
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* Icono de Notificaciones */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {/* Badge de notificaciones pendientes */}
                {professionalNotifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
                )}
              </button>

              {/* Dropdown de notificaciones */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {professionalNotifications.filter(n => !n.read).length} sin leer
                        </p>
                      </div>
                      {professionalNotifications.filter(n => !n.read).length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Guardar todas las IDs como leídas en localStorage
                            const readNotifications = getReadNotifications();
                            professionalNotifications.forEach(n => {
                              if (!n.read) {
                                readNotifications.add(n.id);
                              }
                            });
                            saveReadNotifications(readNotifications);
                            setProfessionalNotifications(prev =>
                              prev.map(n => ({ ...n, read: true }))
                            );
                            toast.success('Todas las notificaciones marcadas como leídas');
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {professionalNotifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No hay notificaciones
                      </div>
                    ) : (
                      professionalNotifications.map((notification) => {
                        const session = notification.session;
                        const patient = patientMap[session?.userId];
                        const patientName = patient?.name || patient?.email || 'Paciente';

                        return (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              // Marcar como leída y guardar en localStorage
                              const readNotifications = getReadNotifications();
                              readNotifications.add(notification.id);
                              saveReadNotifications(readNotifications);
                              setProfessionalNotifications(prev =>
                                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                              );

                              // Si es una notificación de sesión, abrir la sesión o el modal correspondiente
                              if (notification.type === 'send_meeting_details' && session) {
                                setSelectedSessionForDetails(session);
                                setShowMeetingDetailsModal(true);
                                setShowNotifications(false);
                              } else if (session) {
                                setSelectedSession(session);
                                setSessionNotes(session.notes || '');
                                setShowNotifications(false);
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className="flex-shrink-0">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${notification.type === 'professional_rated' ? 'bg-yellow-100' :
                                  notification.type === 'session_rated' ? 'bg-green-100' :
                                    notification.type === 'meeting_type_chosen' ? 'bg-blue-100' :
                                      'bg-purple-100'
                                  }`}>
                                  {notification.type === 'professional_rated' || notification.type === 'session_rated' ? (
                                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  )}
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                {notification.type === 'send_meeting_details' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (session) {
                                        setSelectedSessionForDetails(session);
                                        setShowMeetingDetailsModal(true);
                                        setShowNotifications(false);
                                      }
                                    }}
                                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    Enviar detalles →
                                  </button>
                                )}
                              </div>
                              {!notification.read && (
                                <span className="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Overlay para cerrar el dropdown */}
              {showNotifications && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowNotifications(false)}
                />
              )}
            </div>

            <div className="flex items-center space-x-3">
              {professionalData?.photoURL ? (
                <img
                  src={professionalData.photoURL}
                  alt={professionalData.fullName || professionalData.name}
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {professionalData?.fullName?.charAt(0)?.toUpperCase() || professionalData?.name?.charAt(0)?.toUpperCase() || 'P'}
                  </span>
                </div>
              )}
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">{professionalData?.fullName || professionalData?.name}</p>
                <p className="text-xs text-gray-500">Profesional</p>
              </div>
            </div>

            <button
              onClick={() => setShowLogoutModal(true)}
              className="text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 transition-colors"
              title="Cerrar sesión"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar de Acciones Rápidas */}
        <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 h-[calc(100vh-80px)] fixed left-0 top-20 transition-all duration-300 z-30 flex flex-col shadow-lg hidden md:flex`}>
          {/* Botón para colapsar/expandir */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-4 bg-white border border-gray-200 rounded-full p-2 shadow-md hover:bg-gray-50 transition-colors z-10"
            title={sidebarCollapsed ? 'Expandir' : 'Colapsar'}
          >
            <svg
              className={`w-4 h-4 text-gray-600 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Contenido del Sidebar */}
          <div className="p-4 flex-1 overflow-y-auto">
            {!sidebarCollapsed && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h3>
            )}

            <div className="space-y-2">
              {/* Nueva Sesión */}
              <button
                onClick={handleNewSession}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all group`}
                title="Nueva Sesión"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Nueva Sesión</p>
                    <p className="text-xs text-gray-600">Programar sesión</p>
                  </div>
                )}
              </button>

              {/* Ver Reportes */}
              <button
                onClick={handleViewReports}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-all group`}
                title="Ver Reportes"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-200">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Ver Reportes</p>
                    <p className="text-xs text-gray-600">Estadísticas y análisis</p>
                  </div>
                )}
              </button>

              {/* Mis Pacientes */}
              <button
                onClick={handleViewPatients}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all group`}
                title="Mis Pacientes"
              >
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Mis Pacientes</p>
                    <p className="text-xs text-gray-600">Gestionar pacientes</p>
                  </div>
                )}
              </button>

              {/* Configuración */}
              <button
                onClick={handleSettings}
                className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} p-3 border border-gray-200 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all group`}
                title="Configuración"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-orange-200">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                {!sidebarCollapsed && (
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900">Configuración</p>
                    <p className="text-xs text-gray-600">Ajustes de cuenta</p>
                  </div>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Contenido principal con margen para el sidebar */}
        <div className={`flex-1 transition-all duration-300 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} ml-0`}>
          <div className="container mx-auto px-6 py-8">
            {/* Welcome Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Bienvenido, {professionalData?.fullName || professionalData?.name || professionalData?.email || 'Profesional'}
              </h1>
              <p className="text-gray-600">
                Última actividad: {professionalData?.lastActivityAt ? formatDate(professionalData.lastActivityAt.toDate()) : 'N/A'}
              </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-blue-100">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 6v6m-4-6h8m-8 6h8" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Sesiones Totales</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalSessions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-green-100">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pacientes</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.totalPatients}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-yellow-100">
                    <svg className="w-6 h-6 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Calificación</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.averageRating}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="p-3 rounded-full bg-purple-100">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Reseñas</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.ratingCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pacientes asignados */}
            <div id="patients-section" className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Pacientes asignados</h2>
                <span className="text-sm text-gray-500">{patients.length} pacientes</span>
              </div>
              {patients.length === 0 ? (
                <p className="text-gray-500">Aún no tienes pacientes asignados.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {patients.map((patient) => {
                    const sessionStats = getPatientSessionStats(patient.id);
                    return (
                      <div key={patient.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">{patient.name || patient.email}</p>
                            <p className="text-xs text-gray-500">{patient.email}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${patient.careStatus === 'alta'
                            ? 'bg-green-100 text-green-700'
                            : patient.careStatus === 'en_progreso'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {patient.careStatus || 'pendiente'}
                          </span>
                        </div>

                        {/* Estadísticas de sesiones */}
                        <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-gray-200">
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Total</p>
                            <p className="text-sm font-semibold text-gray-900">{sessionStats.total}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Activas</p>
                            <p className="text-sm font-semibold text-blue-600">{sessionStats.active}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-gray-500">Completadas</p>
                            <p className="text-sm font-semibold text-green-600">{sessionStats.completed}</p>
                          </div>
                        </div>

                        {sessionStats.lastSession && (
                          <div className="text-xs text-gray-500 mb-2">
                            Última sesión: {formatRelativeTime(sessionStats.lastSession.updatedAt || sessionStats.lastSession.createdAt)}
                          </div>
                        )}

                        {/* Estimación de sesiones y progreso */}
                        <div className="mb-3 p-2 bg-gray-50 rounded-md">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">Sesiones:</span>
                            <span className="text-xs text-gray-600">
                              {sessionStats.completed} / {estimatedSessions[patient.id] || 'N/A'} completadas
                            </span>
                          </div>
                          {estimatedSessions[patient.id] && (
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${Math.min(100, Math.round((sessionStats.completed / estimatedSessions[patient.id]) * 100))}%`
                                }}
                              ></div>
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() => handleStartChatWithPatient(patient.id)}
                            className="flex-1 px-2 py-1 bg-primary-600 text-white rounded text-xs hover:bg-primary-700 flex items-center justify-center space-x-1"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Chat</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatientForEstimate(patient);
                              setNewEstimatedSessions(estimatedSessions[patient.id] || '');
                              setShowSessionEstimateModal(true);
                            }}
                            className="flex-1 px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                          >
                            {estimatedSessions[patient.id] ? 'Editar Estimación' : 'Estimar Sesiones'}
                          </button>
                          {estimatedSessions[patient.id] && (
                            <button
                              onClick={() => {
                                setSelectedPatientForEstimate(patient);
                                setSessionsToAdd('');
                                setShowAddSessionsModal(true);
                              }}
                              className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                            >
                              Agregar Sesiones
                            </button>
                          )}
                        </div>

                        {/* Progreso del paciente - Sesiones completadas */}
                        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Progreso del Paciente:</span>
                            <span className="text-sm font-semibold text-green-700">
                              {sessionStats.completed} sesión{sessionStats.completed !== 1 ? 'es' : ''} completada{sessionStats.completed !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        <div className="text-sm text-gray-700 mb-2">
                          <p className="font-medium">Notas de Seguimiento:</p>
                          <p className="text-gray-600">{patient.careProgress || 'Sin notas registradas'}</p>
                        </div>

                        <label className="block text-xs text-gray-500 mb-1">Actualizar notas de seguimiento</label>
                        <textarea
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2"
                          rows={2}
                          value={patientProgress[patient.id] || ''}
                          onChange={(e) => setPatientProgress(prev => ({ ...prev, [patient.id]: e.target.value }))}
                          placeholder="Notas breves de seguimiento"
                        />
                        <div className="mb-2">
                          <button
                            onClick={() => handleViewSessionHistory(patient)}
                            className="w-full px-3 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                          >
                            📋 Ver Historial Completo de Sesiones
                          </button>
                        </div>
                        <div className="flex items-center justify-between space-x-2">
                          <button
                            onClick={() => handleSavePatientProgress(patient.id)}
                            disabled={patientUpdating === patient.id}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
                          >
                            {patientUpdating === patient.id ? 'Guardando...' : 'Guardar progreso'}
                          </button>
                          <button
                            onClick={() => handleDischargePatient(patient.id)}
                            disabled={patientUpdating === patient.id}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {patientUpdating === patient.id ? 'Procesando...' : 'Dar alta'}
                          </button>
                        </div>
                        <label className="block text-xs text-gray-500 mt-2 mb-1">Nota de alta (opcional)</label>
                        <textarea
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          rows={2}
                          value={dischargeNotes[patient.id] || ''}
                          onChange={(e) => setDischargeNotes(prev => ({ ...prev, [patient.id]: e.target.value }))}
                          placeholder="Motivo de alta"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sesiones pendientes y progreso */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Sesiones pendientes</h2>
                {sessionLoading && <span className="text-sm text-gray-500">Cargando...</span>}
              </div>
              {sessions.filter(s => s.status !== 'completed').length === 0 ? (
                <p className="text-gray-500">No hay sesiones pendientes.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {sessions.filter(s => s.status !== 'completed').map((session) => (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Sesión con {patientMap[session.userId]?.name || patientMap[session.userId]?.email || session.userId}
                            </p>
                            <p className="text-xs text-gray-500">Tipo: {session.sessionType}</p>
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                            {session.status}
                          </span>
                        </div>
                        <div className="mt-2">
                          <label className="block text-xs text-gray-500 mb-1">Progreso ({session.progress || 0}%)</label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={session.progress || 0}
                            onChange={(e) => handleProgressUpdate(session.id, Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      </div>
                      {/* Mostrar información de sesión programada */}
                      {session.status === 'scheduled' && session.scheduledDate && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-xs text-blue-800">
                            <strong>Programada:</strong> {new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES')} {session.scheduledTime ? `a las ${session.scheduledTime}` : ''}
                          </p>
                          {session.meetingType ? (
                            <p className="text-xs text-blue-700 mt-1">
                              Tipo: {session.meetingType === 'virtual' ? 'Virtual' : 'Presencial'}
                              {!session.meetingLink && !session.meetingLocation && (
                                <span className="ml-2 text-orange-600 font-semibold">⚠️ Pendiente enviar detalles</span>
                              )}
                            </p>
                          ) : (
                            <p className="text-xs text-orange-700 mt-1">
                              ⏳ Esperando que el paciente elija el tipo de sesión
                            </p>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-2">
                        {session.status === 'scheduled' && session.meetingType && !session.meetingLink && !session.meetingLocation && (
                          <button
                            onClick={() => {
                              setSelectedSessionForDetails(session);
                              setShowMeetingDetailsModal(true);
                            }}
                            className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                          >
                            Enviar {session.meetingType === 'virtual' ? 'Enlace' : 'Ubicación'}
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            // Limpiar 'none' al cargar las notas
                            const cleanNotes = session.notes && session.notes !== 'none' ? session.notes : '';
                            setSessionNotes(cleanNotes);
                          }}
                          className="px-3 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 disabled:opacity-50"
                        >
                          Gestionar Sesión
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Profile Card */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="text-center mb-6">
                    {professionalData?.photoURL ? (
                      <img
                        src={professionalData.photoURL}
                        alt={professionalData.fullName || professionalData.name}
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 mx-auto mb-4"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-white text-2xl font-semibold">
                          {professionalData?.fullName?.charAt(0)?.toUpperCase() || professionalData?.name?.charAt(0)?.toUpperCase() || 'P'}
                        </span>
                      </div>
                    )}
                    <h3 className="text-xl font-semibold text-gray-900">{professionalData?.fullName || professionalData?.name}</h3>
                    <p className="text-gray-600">{professionalData?.speciality}</p>
                    <div className="flex items-center justify-center mt-2">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="ml-1 text-sm text-gray-600">
                          {professionalData?.rating} ({professionalData?.ratingCount} reseñas)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Especialidad</h4>
                      <p className="text-sm text-gray-900">{professionalData?.speciality}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Años de experiencia</h4>
                      <p className="text-sm text-gray-900">{professionalData?.exprecienceYears} años</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Biografía</h4>
                      <p className="text-sm text-gray-900">{professionalData?.bio}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Contacto</h4>
                      <div className="space-y-2">
                        <p className="text-sm text-gray-900">{professionalData?.contact?.phone}</p>
                        <p className="text-sm text-gray-900">{professionalData?.contact?.email}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        // Inicializar formulario con datos actuales
                        // Manejar tanto specialities (array) como speciality (string)
                        const currentSpecialities = professionalData?.specialities ||
                          (professionalData?.speciality ? [professionalData.speciality] : []);

                        setProfileFormData({
                          fullName: professionalData?.fullName || professionalData?.name || '',
                          phone: professionalData?.contact?.phone || professionalData?.phone || '',
                          bio: professionalData?.bio || '',
                          whatsapp: professionalData?.contact?.whatsapp || '',
                          instagram: professionalData?.contact?.instagram || '',
                          linkedin: professionalData?.contact?.linkedin || '',
                          specialities: currentSpecialities,
                          exprecienceYears: professionalData?.exprecienceYears || ''
                        });
                        setShowEditProfileModal(true);
                      }}
                      className="w-full mt-6 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Editar Perfil
                    </button>
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Recent Activity */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
                  <div className="space-y-4">
                    {recentActivities.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No hay actividades recientes</p>
                    ) : (
                      recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                          <div className={`w-10 h-10 ${activity.color === 'green' ? 'bg-green-100' : activity.color === 'blue' ? 'bg-blue-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center`}>
                            {activity.icon === 'check' ? (
                              <svg className={`w-5 h-5 ${activity.color === 'green' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className={`w-5 h-5 ${activity.color === 'green' ? 'text-green-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                          </div>
                          <span className="text-sm text-gray-500">{formatRelativeTime(activity.timestamp)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmación de cerrar sesión */}
      {
        showLogoutModal && (
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowLogoutModal(false);
              }
            }}
          >
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mt-4">Cerrar Sesión</h3>
                <div className="mt-2 px-7 py-3">
                  <p className="text-sm text-gray-500">
                    ¿Estás seguro de que deseas cerrar sesión? Serás redirigido al inicio de sesión.
                  </p>
                </div>
                <div className="flex items-center justify-center space-x-4 mt-4">
                  <button
                    onClick={() => setShowLogoutModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl leading-6 font-semibold text-gray-900">
                    Gestionar Sesión
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedSession(null);
                      setSessionNotes('');
                      setQuickCompleteReason('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Paciente: {patientMap[selectedSession.userId]?.name || patientMap[selectedSession.userId]?.email || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Tipo: {selectedSession.sessionType || 'N/A'} | Progreso: {selectedSession.progress || 0}%
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1 text-xs rounded-full ${selectedSession.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : selectedSession.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {selectedSession.status || 'activa'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Opciones rápidas de finalización */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Finalización Rápida (opcional)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'completada', label: '✓ Completada', icon: '✓', activeClass: 'border-green-500 bg-green-50' },
                      { value: 'paciente_ausente', label: '⚠ No asistió', icon: '⚠', activeClass: 'border-yellow-500 bg-yellow-50' },
                      { value: 'reagendada', label: '🔄 Reagendada', icon: '🔄', activeClass: 'border-blue-500 bg-blue-50' },
                      { value: 'emergencia', label: '🚨 Emergencia', icon: '🚨', activeClass: 'border-red-500 bg-red-50' }
                    ].map((option) => {
                      const isActive = quickCompleteReason === option.value || endReasons[selectedSession.id] === option.label;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => {
                            setQuickCompleteReason(option.value);
                            setEndReasons(prev => ({ ...prev, [selectedSession.id]: option.label }));
                          }}
                          className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${isActive
                            ? option.activeClass
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                          <span className="text-sm font-medium text-gray-700">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Observaciones */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones de la sesión (visibles en tiempo real para el paciente)
                  </label>

                  {/* Plantillas rápidas */}
                  <div className="mb-2 flex flex-wrap gap-2">
                    {[
                      'Sesión productiva, buen avance',
                      'Paciente colaborativo',
                      'Requiere seguimiento adicional',
                      'Progreso satisfactorio',
                      'Temas importantes tratados'
                    ].map((template) => (
                      <button
                        key={template}
                        type="button"
                        onClick={() => setSessionNotes(prev => prev ? `${prev}\n${template}` : template)}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
                      >
                        {template}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={5}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 mt-1 block w-full sm:text-sm border border-gray-300 rounded-md p-3"
                    value={sessionNotes}
                    onChange={(e) => setSessionNotes(e.target.value)}
                    placeholder="Añade notas sobre el progreso del paciente, temas tratados, observaciones, etc. Estas serán visibles para el paciente en tiempo real."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Usa las plantillas rápidas arriba o escribe tus propias observaciones.
                  </p>
                </div>

                {/* Botones de acción */}
                <div className="flex space-x-3 mt-6">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                    onClick={async () => {
                      try {
                        // Limpiar notas - no guardar si está vacío o es 'none'
                        const cleanNotes = sessionNotes && sessionNotes.trim() !== '' ? sessionNotes : '';
                        await updateSessionProgress(selectedSession.id, { notes: cleanNotes });
                        const patient = patientMap[selectedSession.userId];
                        if (patient && cleanNotes && cleanNotes.trim() !== '') {
                          try {
                            await sendSessionObservationsNotification({
                              userEmail: patient.email,
                              userName: patient.name || patient.email,
                              professionalName: professionalData?.fullName || professionalData?.name,
                              sessionType: selectedSession.sessionType,
                              hasObservations: true
                            });
                          } catch (emailError) {
                            console.error('❌ Error al enviar notificación:', emailError);
                          }
                        }
                        toast.success('Observaciones guardadas exitosamente');
                      } catch (error) {
                        console.error('❌ Error al guardar observaciones:', error);
                        toast.error('Error al guardar las observaciones');
                      }
                    }}
                    disabled={!sessionNotes || sessionNotes.trim() === ''}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Observaciones
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm disabled:opacity-50"
                    onClick={() => {
                      handleCompleteSession(selectedSession);
                    }}
                    disabled={closingSessionId === selectedSession.id}
                  >
                    {closingSessionId === selectedSession.id ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Finalizando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Finalizar Sesión
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    className="px-4 py-2 inline-flex justify-center rounded-md border border-gray-300 shadow-sm bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => {
                      setSelectedSession(null);
                      setSessionNotes('');
                      setQuickCompleteReason('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Nueva Sesión */}
      {
        showNewSessionModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                  Crear Nueva Sesión
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Solo puedes crear sesiones con pacientes que han sido emparejados contigo.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleccionar Paciente Emparejado
                    </label>
                    {patients.length === 0 ? (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800">
                          No tienes pacientes emparejados. Los pacientes aparecerán aquí una vez que completen una evaluación y sean emparejados contigo.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={selectedPatientForSession}
                        onChange={(e) => setSelectedPatientForSession(e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                      >
                        <option value="">Selecciona un paciente</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.name || patient.email} {patient.careStatus === 'alta' ? '(Alta)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  {selectedPatientForSession && (() => {
                    const selectedPatient = patients.find(p => p.id === selectedPatientForSession);
                    const activeSessions = sessions.filter(
                      s => s.userId === selectedPatientForSession &&
                        (s.status === 'active' || s.status === 'in_progress')
                    );

                    return (
                      <div className={`border rounded-md p-3 ${activeSessions.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className="text-xs font-medium mb-1">
                          <strong>Paciente seleccionado:</strong> {selectedPatient?.name || selectedPatient?.email}
                        </p>
                        {selectedPatient?.careStatus && (
                          <p className="text-xs mb-1">
                            Estado de atención: <span className="font-semibold">{selectedPatient.careStatus}</span>
                          </p>
                        )}
                        {activeSessions.length > 0 ? (
                          <div className="mt-2 p-2 bg-yellow-100 rounded border border-yellow-300">
                            <p className="text-xs text-yellow-800 font-semibold">
                              ⚠️ Este paciente tiene {activeSessions.length} sesión(es) activa(s)
                            </p>
                            <p className="text-xs text-yellow-700 mt-1">
                              Debes finalizar las sesiones activas antes de crear una nueva.
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs text-green-700 mt-1">
                            ✓ No hay sesiones activas. Puedes crear una nueva sesión.
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Sesión
                    </label>
                    <select
                      value={newSessionType}
                      onChange={(e) => setNewSessionType(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                    >
                      <option value="consultation">Consulta</option>
                      <option value="evaluation">Evaluación</option>
                      <option value="follow-up">Seguimiento</option>
                      <option value="therapy">Terapia</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de la Sesión <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={newSessionDate}
                      onChange={(e) => setNewSessionDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hora de la Sesión <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      value={newSessionTime}
                      onChange={(e) => setNewSessionTime(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900"
                      required
                    />
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Nota:</strong> El paciente recibirá una notificación y deberá elegir si la sesión será virtual o presencial.
                      Una vez que elija, podrás enviar el enlace de reunión o la ubicación de la clínica según corresponda.
                    </p>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm disabled:opacity-50"
                    onClick={handleCreateSession}
                    disabled={creatingSession || !selectedPatientForSession || patients.length === 0 || !newSessionDate || !newSessionTime}
                  >
                    {creatingSession ? 'Creando...' : 'Crear Sesión'}
                  </button>
                  <button
                    type="button"
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                    onClick={() => {
                      setShowNewSessionModal(false);
                      setSelectedPatientForSession('');
                      setNewSessionType('consultation');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Reportes */}
      {
        showReportsModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Reportes y Estadísticas
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total de Sesiones</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total de Pacientes</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.totalPatients}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Calificación Promedio</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.averageRating.toFixed(1)}</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">Total de Reseñas</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.ratingCount}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Sesiones por Estado</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Completadas</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sessions.filter(s => s.status === 'completed').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">En Progreso</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sessions.filter(s => s.status === 'in_progress').length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Activas</span>
                        <span className="text-sm font-medium text-gray-900">
                          {sessions.filter(s => s.status === 'active').length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6">
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => setShowReportsModal(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Configuración */}
      {
        showSettingsModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Configuración de Cuenta
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Nombre:</strong> {professionalData?.fullName || professionalData?.name}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Email:</strong> {professionalData?.email}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Especialidad:</strong> {professionalData?.speciality || 'No especificada'}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Teléfono:</strong> {professionalData?.contact?.phone || professionalData?.phone || 'No especificado'}
                    </p>
                  </div>
                </div>
                <div className="mt-5 sm:mt-6 flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                    onClick={() => {
                      setShowSettingsModal(false);
                      // Inicializar formulario con datos actuales
                      // Manejar tanto specialities (array) como speciality (string)
                      const currentSpecialities = professionalData?.specialities ||
                        (professionalData?.speciality ? [professionalData.speciality] : []);

                      setProfileFormData({
                        fullName: professionalData?.fullName || professionalData?.name || '',
                        phone: professionalData?.contact?.phone || professionalData?.phone || '',
                        bio: professionalData?.bio || '',
                        whatsapp: professionalData?.contact?.whatsapp || '',
                        instagram: professionalData?.contact?.instagram || '',
                        linkedin: professionalData?.contact?.linkedin || '',
                        specialities: currentSpecialities,
                        exprecienceYears: professionalData?.exprecienceYears || ''
                      });
                      setShowEditProfileModal(true);
                    }}
                  >
                    Editar Perfil
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => setShowSettingsModal(false)}
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Editar Perfil */}
      {
        showEditProfileModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Editar Perfil Profesional
                </h3>

                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Nombre Completo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={profileFormData.fullName}
                      onChange={handleProfileInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileFormData.phone}
                      onChange={handleProfileInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="+595 9XX XXX XXX"
                      required
                    />
                  </div>

                  {/* Años de Experiencia */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Años de Experiencia *
                    </label>
                    <select
                      name="exprecienceYears"
                      value={profileFormData.exprecienceYears}
                      onChange={handleProfileInputChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Seleccionar</option>
                      <option value="0">Recién graduado</option>
                      <option value="1">1 año</option>
                      <option value="2">2 años</option>
                      <option value="3">3 años</option>
                      <option value="4">4 años</option>
                      <option value="5">5 años</option>
                      <option value="6-10">6-10 años</option>
                      <option value="11-15">11-15 años</option>
                      <option value="16-20">16-20 años</option>
                      <option value="20+">Más de 20 años</option>
                    </select>
                  </div>

                  {/* Especialidades */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especialidades * (selecciona al menos una)
                    </label>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                      {availableSpecialities.map((speciality) => (
                        <label key={speciality} className="flex items-center cursor-pointer hover:bg-gray-50 p-1 rounded">
                          <input
                            type="checkbox"
                            checked={profileFormData.specialities.includes(speciality)}
                            onChange={() => handleSpecialityToggle(speciality)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">{speciality}</span>
                        </label>
                      ))}
                    </div>
                    {profileFormData.specialities.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">Debes seleccionar al menos una especialidad</p>
                    )}
                  </div>

                  {/* Biografía */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Biografía Profesional *
                    </label>
                    <textarea
                      name="bio"
                      value={profileFormData.bio}
                      onChange={handleProfileInputChange}
                      rows={4}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Cuéntanos sobre tu experiencia, enfoque terapéutico y especialidades..."
                      required
                    />
                  </div>

                  {/* Contacto Adicional */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Información de Contacto Adicional (Opcional)</h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          WhatsApp
                        </label>
                        <input
                          type="tel"
                          name="whatsapp"
                          value={profileFormData.whatsapp}
                          onChange={handleProfileInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="+595 9XX XXX XXX"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Instagram
                        </label>
                        <input
                          type="text"
                          name="instagram"
                          value={profileFormData.instagram}
                          onChange={handleProfileInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="@tu_usuario"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          LinkedIn
                        </label>
                        <input
                          type="url"
                          name="linkedin"
                          value={profileFormData.linkedin}
                          onChange={handleProfileInputChange}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="https://linkedin.com/in/tu-perfil"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Información de solo lectura */}
                  <div className="border-t border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Información que no se puede editar</h4>
                    <div className="bg-gray-50 rounded-md p-3 space-y-1">
                      <p className="text-xs text-gray-600"><strong>Email:</strong> {professionalData?.email}</p>
                      <p className="text-xs text-gray-600"><strong>Código Profesional:</strong> {professionalData?.professionalcode || 'N/A'}</p>
                      <p className="text-xs text-gray-500 italic">Para cambiar estos datos, contacta al administrador.</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm disabled:opacity-50"
                    onClick={handleSaveProfile}
                    disabled={editingProfile || !profileFormData.fullName || !profileFormData.phone || !profileFormData.bio || profileFormData.specialities.length === 0 || !profileFormData.exprecienceYears}
                  >
                    {editingProfile ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => setShowEditProfileModal(false)}
                    disabled={editingProfile}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Estimar Sesiones */}
      {
        showSessionEstimateModal && selectedPatientForEstimate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Estimar Sesiones Necesarias
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Paciente: <strong>{selectedPatientForEstimate.name || selectedPatientForEstimate.email}</strong>
                  </p>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de sesiones estimadas *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newEstimatedSessions}
                    onChange={(e) => setNewEstimatedSessions(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Ej: 10"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Estima cuántas sesiones necesitará este paciente para completar su tratamiento.
                  </p>
                </div>
                <div className="flex space-x-3 mt-5">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:text-sm"
                    onClick={handleEstimateSessions}
                    disabled={!newEstimatedSessions || isNaN(newEstimatedSessions) || parseInt(newEstimatedSessions) <= 0}
                  >
                    Guardar Estimación
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => {
                      setShowSessionEstimateModal(false);
                      setSelectedPatientForEstimate(null);
                      setNewEstimatedSessions('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para Agregar Sesiones */}
      {
        showAddSessionsModal && selectedPatientForEstimate && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  Agregar Sesiones Adicionales
                </h3>
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Paciente: <strong>{selectedPatientForEstimate.name || selectedPatientForEstimate.email}</strong>
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                    <p className="text-xs text-blue-800">
                      <strong>Sesiones estimadas actuales:</strong> {estimatedSessions[selectedPatientForEstimate.id] || 0}
                    </p>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sesiones adicionales a agregar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={sessionsToAdd}
                    onChange={(e) => setSessionsToAdd(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                    placeholder="Ej: 5"
                  />
                  {sessionsToAdd && !isNaN(sessionsToAdd) && parseInt(sessionsToAdd) > 0 && (
                    <p className="text-xs text-gray-600 mt-2">
                      Nuevo total estimado: <strong>{(estimatedSessions[selectedPatientForEstimate.id] || 0) + parseInt(sessionsToAdd)}</strong> sesiones
                    </p>
                  )}
                </div>
                <div className="flex space-x-3 mt-5">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm"
                    onClick={handleAddSessions}
                    disabled={!sessionsToAdd || isNaN(sessionsToAdd) || parseInt(sessionsToAdd) <= 0}
                  >
                    Agregar Sesiones
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => {
                      setShowAddSessionsModal(false);
                      setSelectedPatientForEstimate(null);
                      setSessionsToAdd('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Confirmación de Alta cuando alcanza 100% */}
      {
        showDischargeModal && patientToDischarge && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-center w-12 h-12 mx-auto bg-green-100 rounded-full mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 text-center mb-2">
                  ¡Paciente ha completado el 100% de las sesiones!
                </h3>
                <p className="text-sm text-gray-600 text-center mb-4">
                  <strong>{patientToDischarge.name || patientToDischarge.email}</strong> ha completado todas las sesiones estimadas.
                </p>
                <p className="text-sm font-medium text-gray-800 mb-4 text-center">
                  ¿Desea dar de alta al paciente?
                </p>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nota de alta (opcional)
                  </label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    value={dischargeNotes[patientToDischarge.id] || ''}
                    onChange={(e) => setDischargeNotes(prev => ({ ...prev, [patientToDischarge.id]: e.target.value }))}
                    placeholder="Motivo de alta o notas adicionales..."
                  />
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:text-sm disabled:opacity-50"
                    onClick={() => handleDischargePatient()}
                    disabled={patientUpdating === patientToDischarge.id}
                  >
                    {patientUpdating === patientToDischarge.id ? 'Procesando...' : 'Sí, dar de alta'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
                    onClick={() => {
                      setShowDischargeModal(false);
                      setPatientToDischarge(null);
                    }}
                    disabled={patientUpdating === patientToDischarge.id}
                  >
                    No, mantener en seguimiento
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Historial Completo de Sesiones */}
      {
        showSessionHistoryModal && selectedPatientForHistory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white mb-10">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl leading-6 font-semibold text-gray-900">
                    Historial Completo de Sesiones
                  </h3>
                  <button
                    onClick={() => {
                      setShowSessionHistoryModal(false);
                      setSelectedPatientForHistory(null);
                      setPatientSessionHistory([]);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900">
                    Paciente: <strong>{selectedPatientForHistory.name || selectedPatientForHistory.email}</strong>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Total de sesiones: <strong>{patientSessionHistory.length}</strong>
                  </p>
                </div>

                {patientSessionHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No hay sesiones registradas para este paciente.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {patientSessionHistory.map((session) => {
                      const startTime = session.startTime?.toDate ? session.startTime.toDate() : new Date(session.startTime || 0);
                      const endTime = session.endTime?.toDate ? session.endTime.toDate() : null;
                      const sessionTypeMap = {
                        'consultation': 'Consulta',
                        'evaluation': 'Evaluación',
                        'follow-up': 'Seguimiento',
                        'therapy': 'Terapia'
                      };

                      return (
                        <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <h4 className="font-semibold text-gray-900">
                                  {sessionTypeMap[session.sessionType] || session.sessionType || 'Sesión'}
                                </h4>
                                <span className={`px-2 py-1 text-xs rounded-full ${session.status === 'completed'
                                  ? 'bg-green-100 text-green-700'
                                  : session.status === 'in_progress'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                  {session.status === 'completed' ? 'Completada' : session.status === 'in_progress' ? 'En Progreso' : 'Activa'}
                                </span>
                              </div>
                              <div className="space-y-1 text-sm text-gray-600">
                                <p>
                                  <strong>Inicio:</strong> {startTime.toLocaleString('es-ES', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                {endTime && (
                                  <p>
                                    <strong>Finalización:</strong> {endTime.toLocaleString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                )}
                                {session.duration && (
                                  <p>
                                    <strong>Duración:</strong> {session.duration} minutos
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              {session.progress !== undefined && (
                                <div className="mb-2">
                                  <p className="text-xs text-gray-500 mb-1">Progreso</p>
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-blue-600 transition-all"
                                      style={{ width: `${session.progress}%` }}
                                    ></div>
                                  </div>
                                  <p className="text-xs text-gray-600 mt-1">{session.progress}%</p>
                                </div>
                              )}
                            </div>
                          </div>

                          {session.notes && session.notes !== 'none' && session.notes.trim() !== '' && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-sm font-medium text-gray-800 mb-1">Observaciones:</p>
                              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">{session.notes}</p>
                            </div>
                          )}

                          {session.endReason && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-500">
                                <strong>Motivo de finalización:</strong> {session.endReason}
                              </p>
                            </div>
                          )}

                          {(session.sessionRating || session.professionalRating) && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <div className="flex items-center space-x-4">
                                {session.sessionRating && session.sessionRating > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Calificación de Sesión:</p>
                                    <div className="flex items-center space-x-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <svg
                                          key={star}
                                          className={`w-4 h-4 ${star <= session.sessionRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      ))}
                                      <span className="text-xs text-gray-600 ml-1">({session.sessionRating}/5)</span>
                                    </div>
                                  </div>
                                )}
                                {session.professionalRating && session.professionalRating > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 mb-1">Calificación al Profesional:</p>
                                    <div className="flex items-center space-x-1">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <svg
                                          key={star}
                                          className={`w-4 h-4 ${star <= session.professionalRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                          fill="currentColor"
                                          viewBox="0 0 20 20"
                                        >
                                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                      ))}
                                      <span className="text-xs text-gray-600 ml-1">({session.professionalRating}/5)</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      }

      {/* Modal para enviar detalles de la reunión */}
      {
        showMeetingDetailsModal && selectedSessionForDetails && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-full max-w-lg shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Enviar Detalles de la Sesión
                  </h3>
                  <button
                    onClick={() => {
                      setShowMeetingDetailsModal(false);
                      setSelectedSessionForDetails(null);
                      setMeetingLink('');
                      setMeetingLocation('');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Paciente:</strong> {patientMap[selectedSessionForDetails.userId]?.name || patientMap[selectedSessionForDetails.userId]?.email || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>Tipo de sesión:</strong> {selectedSessionForDetails.meetingType === 'virtual' ? 'Virtual' : 'Presencial'}
                  </p>
                  {selectedSessionForDetails.scheduledDate && (
                    <p className="text-sm text-gray-600">
                      <strong>Fecha y hora:</strong> {new Date(selectedSessionForDetails.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES')} {selectedSessionForDetails.scheduledTime ? `a las ${selectedSessionForDetails.scheduledTime}` : ''}
                    </p>
                  )}
                </div>

                {selectedSessionForDetails.meetingType === 'virtual' ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enlace de la reunión (Meet, Zoom, etc.) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx o https://zoom.us/j/xxxxx"
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa el enlace completo de la videollamada
                    </p>
                  </div>
                ) : (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación de la clínica <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      placeholder="Ej: Calle Principal 123, Ciudad, País"
                      rows={3}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Ingresa la dirección completa de la clínica
                    </p>
                  </div>
                )}

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowMeetingDetailsModal(false);
                      setSelectedSessionForDetails(null);
                      setMeetingLink('');
                      setMeetingLocation('');
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSendMeetingDetails}
                    disabled={sendingDetails || (selectedSessionForDetails.meetingType === 'virtual' && !meetingLink.trim()) || (selectedSessionForDetails.meetingType === 'presencial' && !meetingLocation.trim())}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingDetails ? 'Enviando...' : 'Enviar Detalles'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Chat Button */}
      <ChatButton
        unreadCount={conversations?.filter(c => c.unreadCount?.[profId] > 0).length || 0}
        onClick={() => {
          setActiveChatId(null);
          setShowChatModal(true);
        }}
      />

      {/* Chat Modal */}
      <Modal
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
        title="Mensajes"
        size="xl"
      >
        <div className="h-[600px]">
          <ChatContainer userId={profId} userType="professional" initialConversationId={activeChatId} />
        </div>
      </Modal>
    </div >
  );
};

export default ProfessionalDashboard;
