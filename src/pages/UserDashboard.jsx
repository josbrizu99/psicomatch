import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getAssignedProfessional, findMatchingProfessional } from '../services/professionalMatchingService';
import { getUserSessions, listenUserSessions, rateSession, rateProfessional, updateMeetingType } from '../services/userSessionsService';
// eslint-disable-next-line no-unused-vars
import { sendMeetingTypeChoiceNotification, sendMeetingDetailsNotification } from '../services/emailService';
import ChatButton from '../components/chat/ChatButton';
import ChatContainer from '../components/chat/ChatContainer';
import Modal from '../components/common/Modal';
import PageLoader from '../components/common/PageLoader';
import { useConversations } from '../hooks/useChat';

const UserDashboard = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState(null);
  const [hasCompletedEvaluation, setHasCompletedEvaluation] = useState(false);
  const [assignedProfessional, setAssignedProfessional] = useState(null);
  const [isSearchingProfessional, setIsSearchingProfessional] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSearchProfessionalModal, setShowSearchProfessionalModal] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [ratingSession, setRatingSession] = useState(null);
  const [sessionRating, setSessionRating] = useState(0);
  const [professionalRating, setProfessionalRating] = useState(0);
  const [ratingSessionId, setRatingSessionId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [ratingProfessional, setRatingProfessional] = useState(null);
  const [sessionProgress, setSessionProgress] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMeetingTypeModal, setShowMeetingTypeModal] = useState(false);
  const [selectedSessionForType, setSelectedSessionForType] = useState(null);
  const [selectedMeetingType, setSelectedMeetingType] = useState('');
  const [showSessionDetailsModal, setShowSessionDetailsModal] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const { conversations } = useConversations(currentUser?.uid);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    loadUserData();
  }, [currentUser, navigate]);

  const loadUserData = async () => {
    try {
      setLoading(true);

      let data = userData;
      if (!data) {
        // Si no hay userData en el contexto, obtenerlo directamente
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          data = userDoc.data();
        }
      }

      if (data) {
        setUserStats(data);
        setHasCompletedEvaluation(data.testsCompleted > 0 || (data.testProgress !== 'null' && data.testProgress !== null));
        setIsSearchingProfessional(data.matchedProfessional === 'searching');

        // Cargar sesiones del usuario (inicial)
        const sessionsResult = await getUserSessions(currentUser.uid);
        if (sessionsResult.success) {
          setSessions(sessionsResult.sessions);
          // Actualizar notificaciones basadas en sesiones
          updateNotificationsFromSessions(sessionsResult.sessions);
        }

        // Cargar progreso de sesiones desde userTestResults
        try {
          const progressQuery = query(
            collection(db, 'userTestResults'),
            where('userId', '==', currentUser.uid)
          );
          const progressSnapshot = await getDocs(progressQuery);
          const progressData = progressSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSessionProgress(progressData);
        } catch (progressError) {
          console.error('❌ Error al cargar progreso de sesiones:', progressError);
        }

        // Si tiene un profesional asignado, cargar sus datos
        if (data.matchedProfessional && data.matchedProfessional !== 'null' && data.matchedProfessional !== 'searching') {
          const professionalResult = await getAssignedProfessional(data.matchedProfessional);
          if (professionalResult.success) {
            setAssignedProfessional(professionalResult.data);
          }
        }

        // Si está buscando profesional, intentar encontrar uno automáticamente
        if (data.matchedProfessional === 'searching' && data.lastTestResults) {
          const matchingResult = await findMatchingProfessional(
            currentUser.uid,
            data.lastTestResults.specialties || ['general'],
            data.lastTestResults
          );

          if (matchingResult.success) {
            setAssignedProfessional(matchingResult.professional);
            setIsSearchingProfessional(false);
          }
        }
      }
    } catch (error) {
      console.error('Error al cargar datos del usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar notificaciones leídas desde localStorage
  const getReadNotifications = () => {
    if (!currentUser) return new Set();
    try {
      const stored = localStorage.getItem(`user_read_notifications_${currentUser.uid}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (error) {
      console.error('Error al cargar notificaciones leídas:', error);
      return new Set();
    }
  };

  // Guardar notificaciones leídas en localStorage
  const saveReadNotifications = (readIds) => {
    if (!currentUser) return;
    try {
      localStorage.setItem(`user_read_notifications_${currentUser.uid}`, JSON.stringify(Array.from(readIds)));
    } catch (error) {
      console.error('Error al guardar notificaciones leídas:', error);
    }
  };

  // Actualizar notificaciones basadas en sesiones
  const updateNotificationsFromSessions = (sessionsList) => {
    const readNotifications = getReadNotifications();
    const newNotifications = [];

    sessionsList.forEach(session => {
      // Notificación: Sesión programada que requiere elegir tipo de reunión
      if (session.status === 'scheduled' && session.requiresPatientChoice && !session.meetingType) {
        const notificationId = `session-${session.id}-choose-type`;
        const sessionTypeMap = {
          'consultation': 'Consulta',
          'evaluation': 'Evaluación',
          'follow-up': 'Seguimiento',
          'therapy': 'Terapia'
        };

        const formattedDate = session.scheduledDate
          ? new Date(session.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
          : '';

        newNotifications.push({
          id: notificationId,
          type: 'session_choice_required',
          title: 'Nueva sesión programada',
          message: `Tienes una ${sessionTypeMap[session.sessionType] || 'sesión'} programada${formattedDate ? ` para el ${formattedDate}` : ''}${session.scheduledTime ? ` a las ${session.scheduledTime}` : ''}. Por favor, elige si será virtual o presencial.`,
          sessionId: session.id,
          session: session,
          timestamp: session.createdAt || new Date(),
          read: readNotifications.has(notificationId)
        });
      }

      // Notificación: Profesional ha enviado detalles de la reunión
      if (session.meetingType && (session.meetingLink || session.meetingLocation)) {
        const notificationId = `session-${session.id}-details`;
        const sessionTypeMap = {
          'consultation': 'Consulta',
          'evaluation': 'Evaluación',
          'follow-up': 'Seguimiento',
          'therapy': 'Terapia'
        };

        newNotifications.push({
          id: notificationId,
          type: 'session_details_received',
          title: 'Detalles de sesión recibidos',
          message: `Tu profesional ha enviado los detalles de tu ${sessionTypeMap[session.sessionType] || 'sesión'}. ${session.meetingType === 'virtual' ? 'Enlace disponible.' : 'Ubicación disponible.'}`,
          sessionId: session.id,
          session: session,
          timestamp: session.updatedAt || new Date(),
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

    setNotifications(newNotifications);
  };

  const handleStartEvaluation = () => {
    console.log('🎯 UserDashboard - handleStartEvaluation ejecutándose');
    console.log('🔍 Profesional asignado:', userData?.matchedProfessional);

    // Si el usuario ya tiene un profesional asignado, mostrar modal de confirmación
    if (userData?.matchedProfessional &&
      userData.matchedProfessional !== 'null' &&
      userData.matchedProfessional !== 'searching') {
      console.log('⚠️ Usuario tiene profesional, mostrando modal de confirmación');
      setShowConfirmModal(true);
    } else {
      console.log('✅ Navegando a /evaluacion-emocional');
      console.log('🔍 URL actual antes de navegar:', window.location.pathname);
      navigate('/evaluacion-emocional');
      console.log('🔍 Navegación ejecutada a /evaluacion-emocional');
    }
  };

  const handleConfirmNewEvaluation = () => {
    setShowConfirmModal(false);
    navigate('/evaluacion-emocional');
  };

  const handleCancelNewEvaluation = () => {
    setShowConfirmModal(false);
  };

  const handleSearchProfessional = () => {
    setShowSearchProfessionalModal(true);
  };

  const handleConfirmSearchProfessional = async () => {
    setShowSearchProfessionalModal(false);
    setLoading(true);

    try {
      console.log('🔄 Buscando nuevo profesional...');

      // Obtener datos frescos del usuario
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const freshData = userDoc.exists() ? userDoc.data() : userData;
      const lastTestResults = freshData?.lastTestResults || userData?.lastTestResults;

      // Usar especialidades del último test, o fallback genérico
      const specialties = lastTestResults?.recommendedSpecialties ||
                         lastTestResults?.specialties ||
                         ['general', 'anxiety', 'depression'];

      const matchingResult = await findMatchingProfessional(
        currentUser.uid,
        specialties,
        lastTestResults || {}
      );

      if (matchingResult.success) {
        console.log('✅ Nuevo profesional encontrado:', matchingResult.professional.name || matchingResult.professional.fullName);

        await updateDoc(doc(db, 'users', currentUser.uid), {
          matchedProfessional: matchingResult.professional.id,
          updatedAt: serverTimestamp()
        });

        setAssignedProfessional(matchingResult.professional);
        setIsSearchingProfessional(false);
        await loadUserData();

        toast.success(`¡Encontramos un nuevo profesional para vos!`);
      } else {
        console.error('❌ No se pudo encontrar profesional:', matchingResult.error);
        toast.error('No encontramos un profesional disponible ahora. Intentá más tarde.');
      }
    } catch (error) {
      console.error('❌ Error al buscar nuevo profesional:', error);
      toast.error('Ocurrió un error. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };



  const handleCancelSearchProfessional = () => {
    setShowSearchProfessionalModal(false);
  };

  const handleViewResults = () => {
    navigate('/mis-resultados');
  };

  const handleUpdateActivity = async () => {
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error al actualizar actividad:', error);
    }
  };

  const handleStartChat = async () => {
    try {
      if (!assignedProfessional) {
        toast.error('No tienes un profesional asignado');
        return;
      }

      // Importar chatService
      const chatService = (await import('../services/chatService')).default;

      // Verificar si ya existe conversación
      const existingConv = conversations?.find(
        c => c.professionalId === assignedProfessional.id ||
          c.participants?.includes(assignedProfessional.id)
      );

      if (existingConv) {
        setActiveChatId(existingConv.id);
      } else {
        // Crear nueva conversación
        const newConvId = await chatService.createConversation(
          currentUser.uid,
          assignedProfessional.id,
          currentUser.displayName || userData?.name || 'Usuario',
          assignedProfessional.name || assignedProfessional.displayName || 'Profesional'
        );
        setActiveChatId(newConvId);
        toast.success('Conversación iniciada');
      }

      // Abrir modal de chat
      setShowChatModal(true);
    } catch (error) {
      console.error('Error al iniciar chat:', error);
      toast.error('Error al iniciar el chat');
    }
  };

  useEffect(() => {
    handleUpdateActivity();
  }, []);

  // Escuchar sesiones en tiempo real para ver observaciones actualizadas
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = listenUserSessions(currentUser.uid, (liveSessions) => {
      setSessions(liveSessions);
      // Actualizar notificaciones cuando cambien las sesiones
      updateNotificationsFromSessions(liveSessions);
    });

    return () => unsubscribe && unsubscribe();
  }, [currentUser]);

  // Efecto para hacer scroll al progreso de sesiones si viene el hash en la URL
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#progreso-sesiones') {
        setTimeout(() => {
          const el = document.getElementById('progreso-sesiones');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 300);
      }
    };

    // Ejecutar al cargar la página
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Función para calificar la sesión
  const handleRateSession = async () => {
    if (!ratingSession || sessionRating === 0) {
      toast.error('Por favor selecciona una calificación para la sesión');
      return;
    }

    try {
      // Usar el ID del documento de Firestore (ratingSession.id) y pasar userId para la notificación
      const result = await rateSession(ratingSession.id, sessionRating, currentUser.uid);

      if (result.success) {
        toast.success(`Has calificado la sesión con ${sessionRating} estrellas. El profesional ha sido notificado.`);
        setSessionRating(0);
        // No limpiar ratingSession todavía, para permitir calificar al profesional
      } else {
        toast.error('Error al calificar la sesión');
      }
    } catch (error) {
      console.error('❌ Error al calificar sesión:', error);
      toast.error('Error al calificar la sesión');
    }
  };

  // Función para elegir tipo de reunión
  const handleChooseMeetingType = async () => {
    if (!selectedSessionForType || !selectedMeetingType) {
      toast.error('Por favor selecciona un tipo de reunión');
      return;
    }

    try {
      const result = await updateMeetingType(selectedSessionForType.id, selectedMeetingType);

      if (result.success) {
        // Obtener datos del profesional para la notificación
        const professionalDoc = await getDoc(doc(db, 'professionals', selectedSessionForType.professionalId));
        let professionalData = null;
        if (professionalDoc.exists()) {
          professionalData = professionalDoc.data();
        }

        // Notificar al profesional
        if (professionalData) {
          try {
            await sendMeetingTypeChoiceNotification({
              professionalEmail: professionalData.email,
              professionalName: professionalData.fullName || professionalData.name,
              userName: userStats?.name || currentUser.email,
              sessionType: selectedSessionForType.sessionType,
              meetingType: selectedMeetingType,
              scheduledDate: selectedSessionForType.scheduledDate,
              scheduledTime: selectedSessionForType.scheduledTime
            });
          } catch (emailError) {
            console.error('❌ Error al enviar notificación:', emailError);
          }
        }

        toast.success(`Has elegido sesión ${selectedMeetingType === 'virtual' ? 'virtual' : 'presencial'}. El profesional ha sido notificado.`);
        setShowMeetingTypeModal(false);
        setSelectedSessionForType(null);
        setSelectedMeetingType('');

        // Recargar sesiones
        await loadUserData();
      } else {
        toast.error(result.error || 'Error al actualizar el tipo de reunión');
      }
    } catch (error) {
      console.error('❌ Error al elegir tipo de reunión:', error);
      toast.error('Error al elegir el tipo de reunión');
    }
  };

  // Función para calificar al profesional
  const handleRateProfessional = async () => {
    if (!ratingSession || professionalRating === 0) {
      toast.error('Por favor selecciona una calificación para el profesional');
      return;
    }

    try {
      // Usar el ID del documento de Firestore (ratingSession.id) y pasar userId para la notificación
      // La notificación ahora se envía directamente desde el servicio
      const result = await rateProfessional(ratingSession.id, professionalRating, ratingSession.professionalId, currentUser.uid);

      if (result.success) {
        // Recargar progreso de sesiones
        try {
          const progressQuery = query(
            collection(db, 'userTestResults'),
            where('userId', '==', currentUser.uid)
          );
          const progressSnapshot = await getDocs(progressQuery);
          const progressData = progressSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setSessionProgress(progressData);
        } catch (progressError) {
          console.error('❌ Error al recargar progreso:', progressError);
        }

        toast.success(`Has calificado al profesional con ${professionalRating} estrellas. El profesional ha sido notificado.`);
        setRatingSession(null);
        setProfessionalRating(0);
        setRatingSessionId(null);
        setRatingProfessional(null);
      } else {
        toast.error('Error al calificar al profesional');
      }
    } catch (error) {
      console.error('❌ Error al calificar profesional:', error);
      toast.error('Error al calificar al profesional');
    }
  };

  if (loading) {
    return <PageLoader text="Cargando tu dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-off via-primary-50 to-secondary-50 relative overflow-hidden pb-20 md:pb-0">
      {/* Decorative background blobs for fluid feel */}
      <div className="absolute top-[10%] left-[-10%] w-96 h-96 bg-primary-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-float-slow"></div>
      <div className="absolute bottom-[20%] right-[-10%] w-[30rem] h-[30rem] bg-secondary-300 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 animate-float-slow" style={{ animationDelay: '2s' }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10 animate-fade-in-up">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate max-w-xs sm:max-w-md">
                ¡Hola, {userStats?.name || currentUser?.displayName || currentUser?.email || 'Usuario'}!
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Bienvenido, {userStats?.name || currentUser?.displayName || currentUser?.email || 'Usuario'}
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
              {/* Icono de notificaciones */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>

                {/* Dropdown de notificaciones */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg z-50 border border-gray-200 max-h-96 overflow-y-auto">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            {notifications.filter(n => !n.read).length} sin leer
                          </p>
                        </div>
                        {notifications.filter(n => !n.read).length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Guardar todas las IDs como leídas en localStorage
                              const readNotifications = getReadNotifications();
                              notifications.forEach(n => {
                                if (!n.read) {
                                  readNotifications.add(n.id);
                                }
                              });
                              saveReadNotifications(readNotifications);
                              setNotifications(prev =>
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
                    <div className="divide-y divide-gray-200">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No hay notificaciones
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                            onClick={() => {
                              if (notification.type === 'session_choice_required') {
                                setSelectedSessionForType(notification.session);
                                setShowMeetingTypeModal(true);
                                setShowNotifications(false);
                              } else if (notification.type === 'session_details_received') {
                                setSelectedSessionForDetails(notification.session);
                                setShowSessionDetailsModal(true);
                                setShowNotifications(false);
                              }
                              // Marcar como leída y guardar en localStorage
                              const readNotifications = getReadNotifications();
                              readNotifications.add(notification.id);
                              saveReadNotifications(readNotifications);
                              setNotifications(prev =>
                                prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
                              );
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  {notification.message}
                                </p>
                                {notification.type === 'session_choice_required' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSessionForType(notification.session);
                                      setShowMeetingTypeModal(true);
                                      setShowNotifications(false);
                                    }}
                                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    Elegir tipo de sesión →
                                  </button>
                                )}
                                {notification.type === 'session_details_received' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSessionForDetails(notification.session);
                                      setShowSessionDetailsModal(true);
                                      setShowNotifications(false);
                                    }}
                                    className="mt-2 text-xs text-primary-600 hover:text-primary-700 font-medium"
                                  >
                                    Ver detalles →
                                  </button>
                                )}
                              </div>
                              {!notification.read && (
                                <span className="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {userStats?.photoURL && (
                <img
                  src={userStats.photoURL}
                  alt="Foto de perfil"
                  className="w-12 h-12 rounded-full border-2 border-white shadow-lg"
                />
              )}
              <div className="text-right hidden sm:block">
                <p className="text-sm text-gray-500">Miembro desde</p>
                <p className="text-sm font-medium text-gray-900">
                  {userStats?.createdAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Estado de evaluación */}
        <div className="mb-8">
          {!hasCompletedEvaluation ? (
            <div className="glass-panel overflow-hidden relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-white/60 to-white/30 border border-white/50">
              {/* Blur accent */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold mb-2">
                    ¡Comienza tu evaluación emocional!
                  </h2>
                  <p className="text-blue-100 mb-6">
                    Realiza nuestra evaluación personalizada para encontrar el profesional
                    más adecuado para tus necesidades específicas.
                  </p>
                  <button
                    onClick={handleStartEvaluation}
                    className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 transition-colors duration-200 shadow-md w-full sm:w-auto text-center"
                  >
                    Empezar Evaluación
                  </button>
                </div>
                <div className="hidden sm:block ml-8 relative z-10">
                  <div className="w-24 h-24 bg-primary-100 rounded-[2rem] flex items-center justify-center shadow-inner">
                    <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : isSearchingProfessional ? (
            <div className="glass-panel overflow-hidden relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-50/80 to-white/40 border border-white/50">
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-amber-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold mb-2">
                    Buscando tu profesional ideal
                  </h2>
                  <p className="text-yellow-100 mb-6">
                    Estamos buscando un profesional especializado que se adecue perfectamente a tu caso.
                    Te notificaremos en cuanto encontremos la mejor opción para ti.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-yellow-100">Buscando...</span>
                  </div>
                </div>
                <div className="hidden sm:block ml-8">
                  <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : assignedProfessional ? (
            <div className="glass-panel overflow-hidden relative rounded-3xl p-4 sm:p-8 md:p-10 bg-gradient-to-br from-primary-50/80 to-secondary-50/40 border border-white/60">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-secondary-200/50 rounded-full mix-blend-multiply filter blur-3xl opacity-40"></div>
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between relative z-10 gap-6 md:gap-8">
                <div className="flex-1 w-full">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
                    ¡Profesional asignado!
                  </h2>
                  <p className="text-gray-600 mb-4 sm:mb-6 font-medium text-base sm:text-lg">
                    Hemos encontrado el profesional ideal para ti:
                  </p>
                  <div className="mb-4 sm:mb-6 bg-white/60 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-xl sm:text-2xl text-primary-700">{assignedProfessional.name}</h3>
                    <p className="text-gray-600 font-medium">{assignedProfessional.specialty || assignedProfessional.speciality || assignedProfessional.specialities?.[0]}</p>
                    <div className="flex items-center gap-4 mt-2 mb-4">
                      <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center">
                        ⭐ {assignedProfessional.calificacion_promedio || assignedProfessional.rating || 'N/A'}
                      </span>
                    </div>
                    {(assignedProfessional.phone || assignedProfessional.email) && (
                      <div className="space-y-1 mb-4 text-sm text-gray-600 bg-white/40 p-3 rounded-xl">
                        {assignedProfessional.phone && <p>📞 {assignedProfessional.phone}</p>}
                        {assignedProfessional.email && <p>✉️ {assignedProfessional.email}</p>}
                      </div>
                    )}
                    {userStats?.careStatus && (
                      <div className="mt-4 text-sm bg-primary-50/50 p-4 rounded-xl border border-primary-100">
                        <p className="text-primary-900"><strong className="text-primary-700">Estado de atención:</strong> {(() => {
                          const statusMap = {
                            'en_progreso': 'En progreso',
                            'alta': 'Alta',
                            'pendiente': 'Pendiente',
                            'activo': 'Activo',
                            'inactivo': 'Inactivo',
                            'en_seguimiento': 'En seguimiento',
                            'nuevo': 'Nuevo',
                          };
                          const s = userStats.careStatus;
                          return statusMap[s] || (s ? s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '');
                        })()}</p>
                        {userStats.careProgress && (
                          <p className="text-primary-800 mt-1"><strong className="text-primary-700">Progreso:</strong> {userStats.careProgress}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleStartChat}
                      className="bg-primary-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-700 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex items-center justify-center space-x-2 w-full sm:w-auto"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span>Chatear</span>
                    </button>
                    <button
                      onClick={handleViewResults}
                      className="glass-panel text-gray-700 px-5 py-3 rounded-xl font-medium hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 w-full sm:w-auto text-center"
                    >
                      Ver Evaluaciones
                    </button>
                    <button
                      onClick={handleStartEvaluation}
                      className="border border-gray-300 bg-white/30 text-gray-700 px-5 py-3 rounded-xl font-medium hover:bg-white/50 transition-all duration-300 w-full sm:w-auto text-center"
                    >
                      Nueva Evaluación
                    </button>
                  </div>
                </div>
                <div className="hidden sm:block flex-shrink-0 animate-float-slow">
                  <div className="w-32 h-32 bg-white/70 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center shadow-soft border border-white">
                    <svg className="w-16 h-16 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel overflow-hidden relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-green-50/80 to-emerald-50/40 border border-white/60">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold mb-2">
                    ¡Evaluación completada!
                  </h2>
                  <p className="text-green-100 mb-6">
                    Has completado tu evaluación emocional. Hemos encontrado
                    un profesional especializado para ti.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleViewResults}
                      className="bg-white text-green-600 px-6 py-3 rounded-lg font-medium hover:bg-green-50 transition-colors duration-200 shadow-lg w-full sm:w-auto text-center"
                    >
                      Ver Mis Evaluaciones
                    </button>
                    <button
                      onClick={handleStartEvaluation}
                      className="bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg font-medium hover:bg-opacity-30 transition-colors duration-200 border border-white border-opacity-30 w-full sm:w-auto text-center"
                    >
                      Nueva Evaluación
                    </button>
                  </div>
                </div>
                <div className="hidden sm:block ml-8">
                  <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Estadísticas del usuario */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Evaluaciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.evaluationsCompleted || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Profesionales</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.professionalMatches || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Sesiones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {sessions.filter(s => s.status === 'active' || s.status === 'in_progress' || s.status === 'scheduled').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Días activos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {userStats?.daysActive || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Acciones Rápidas</h3>
            <div className="space-y-4">
              <button
                onClick={handleStartEvaluation}
                className="w-full flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <div className="p-2 bg-blue-500 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Nueva Evaluación</p>
                  <p className="text-sm text-gray-600">Realiza una evaluación emocional</p>
                </div>
              </button>

              <button
                onClick={handleViewResults}
                className="w-full flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
              >
                <div className="p-2 bg-green-500 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Ver Mis Evaluaciones</p>
                  <p className="text-sm text-gray-600">Historial de evaluaciones</p>
                </div>
              </button>

              <button
                onClick={handleSearchProfessional}
                className="w-full flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
              >
                <div className="p-2 bg-purple-500 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Buscar Profesionales</p>
                  <p className="text-sm text-gray-600">Encuentra psicólogos especializados</p>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Información del Perfil</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-medium text-gray-900">{userStats?.name || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{userStats?.email || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Género:</span>
                <span className="font-medium text-gray-900">{userStats?.gender || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Ubicación:</span>
                <span className="font-medium text-gray-900">{userStats?.location || 'No especificado'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-gray-600">Completitud del perfil:</span>
                <span className="font-medium text-gray-900">{userStats?.profileCompleteness || 0}%</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Último acceso:</span>
                <span className="font-medium text-gray-900">
                  {userStats?.lastLoginAt?.toDate?.()?.toLocaleDateString() || 'Reciente'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Información de Atención y Progreso */}
        {userStats?.careStatus && (
          <div className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Estado de Atención</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-gray-900">Estado Actual</p>
                  <span className={`px-3 py-1 text-sm rounded-full ${userStats.careStatus === 'alta'
                    ? 'bg-green-100 text-green-700'
                    : userStats.careStatus === 'en_progreso'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {userStats.careStatus === 'alta' ? 'Alta Médica' : userStats.careStatus === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
                  </span>
                </div>
                {userStats.careProgress && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Progreso y Observaciones:</p>
                    <p className="text-sm text-gray-600">{userStats.careProgress}</p>
                  </div>
                )}
                {userStats.careUpdatedAt && (
                  <p className="text-xs text-gray-500 mt-2">
                    Última actualización: {userStats.careUpdatedAt.toDate ? userStats.careUpdatedAt.toDate().toLocaleDateString('es-ES') : 'N/A'}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Progreso de Sesiones desde userTestResults */}
        {sessionProgress.length > 0 && (
          <div id="progreso-sesiones" className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Progreso de Sesiones</h3>
              {sessionProgress.filter(progress => progress.sessionData).length > 4 && (
                <Link
                  to="/user-session-progress"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                >
                  Ver completo
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {sessionProgress
                .filter(progress => progress.sessionData) // Solo mostrar progreso con datos de sesión
                .slice(0, 4) // Mostrar solo los primeros 4
                .map((progress) => {
                  const sessionData = progress.sessionData || {};
                  const completedAt = progress.completedAt?.toDate ? progress.completedAt.toDate() : new Date(progress.completedAt);

                  // Mapeo de tipos de sesión al español
                  const sessionTypeMap = {
                    'consultation': 'Consulta',
                    'evaluation': 'Evaluación',
                    'follow-up': 'Seguimiento',
                    'therapy': 'Terapia',
                    'none': 'Sesión'
                  };

                  const sessionType = sessionData.sessionType || progress.testType || 'none';
                  const sessionTypeLabel = sessionTypeMap[sessionType] || sessionType;

                  return (
                    <div key={progress.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {sessionTypeLabel}
                          </p>
                          <p className="text-xs text-gray-500">
                            Completada: {completedAt.toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        <div className="text-right">
                          {progress.percentage !== undefined && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Progreso</p>
                              <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600 transition-all"
                                  style={{ width: `${progress.percentage}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{progress.percentage}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {sessionData.duration && (
                        <p className="text-xs text-gray-600 mt-2">
                          Duración: {sessionData.duration} minutos
                        </p>
                      )}
                      {progress.score > 0 && (
                        <div className="mt-2 flex items-center space-x-1">
                          <span className="text-xs text-gray-600">Calificación:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-4 h-4 ${star <= progress.score ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-xs text-gray-600 ml-1">({progress.score}/5)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Historial de Sesiones */}
        {sessions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Historial de Sesiones con tu Profesional</h3>
              {sessions.length > 4 && (
                <Link
                  to="/user-session-history"
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center"
                >
                  Ver completo
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
            <div className="space-y-4">
              {sessions.slice(0, 4).map((session) => {
                const startTime = session.startTime?.toDate ? session.startTime.toDate() : (session.startTime?.seconds ? new Date(session.startTime.seconds * 1000) : new Date(session.startTime));
                const endTime = session.endTime?.toDate ? session.endTime.toDate() : (session.endTime?.seconds ? new Date(session.endTime.seconds * 1000) : null);
                const sessionTypeMap = {
                  'consultation': 'Consulta',
                  'evaluation': 'Evaluación',
                  'follow-up': 'Seguimiento',
                  'therapy': 'Terapia'
                };

                return (
                  <div key={session.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="font-medium text-gray-900">
                            {sessionTypeMap[session.sessionType] || session.sessionType || 'Sesión'}
                          </p>
                          <span className={`px-2 py-1 text-xs rounded-full ${session.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : session.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                            {session.status === 'completed' ? 'Completada' : session.status === 'in_progress' ? 'En Progreso' : 'Activa'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Fecha: {startTime.toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        {endTime && (
                          <p className="text-xs text-gray-500">
                            Finalizada: {endTime.toLocaleDateString('es-ES')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {session.duration ? (
                          <p className="text-sm font-medium text-gray-900">{session.duration} min</p>
                        ) : session.progress !== undefined ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Progreso</p>
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all"
                                style={{ width: `${session.progress}%` }}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{session.progress}%</p>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {session.notes && session.notes !== 'none' && session.notes.trim() !== '' && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-800 mb-2">Observaciones del Profesional:</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{session.notes}</p>
                      </div>
                    )}

                    {session.endReason && (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500">
                          <strong>Motivo de finalización:</strong> {session.endReason}
                        </p>
                      </div>
                    )}

                    {/* Calificaciones: Sesión y Profesional */}
                    {session.status === 'completed' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                        {/* Calificación de la sesión */}
                        <div>
                          <p className="text-sm font-medium text-gray-800 mb-2">Califica esta sesión:</p>
                          {session.sessionRating && session.sessionRating > 0 ? (
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-5 h-5 ${star <= session.sessionRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="text-sm text-gray-600 ml-2">({session.sessionRating}/5)</span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                      setRatingSession(session);
                                      setSessionRating(star);
                                      setRatingSessionId(session.id);
                                    }}
                                    className={`w-8 h-8 ${ratingSessionId === session.id && sessionRating >= star
                                      ? 'text-yellow-400'
                                      : 'text-gray-300 hover:text-yellow-300'
                                      } transition-colors`}
                                  >
                                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                              {ratingSessionId === session.id && sessionRating > 0 && (
                                <button
                                  onClick={handleRateSession}
                                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                                >
                                  Calificar Sesión
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Calificación del profesional */}
                        <div className="pt-3 border-t border-gray-100">
                          <p className="text-sm font-medium text-gray-800 mb-2">Califica a tu profesional:</p>
                          {session.professionalRating && session.professionalRating > 0 ? (
                            <div className="flex items-center space-x-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <svg
                                  key={star}
                                  className={`w-5 h-5 ${star <= session.professionalRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                              <span className="text-sm text-gray-600 ml-2">({session.professionalRating}/5)</span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center space-x-1 mb-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => {
                                      setRatingSession(session);
                                      setProfessionalRating(star);
                                      setRatingSessionId(session.id);
                                    }}
                                    className={`w-8 h-8 ${ratingSessionId === session.id && professionalRating >= star
                                      ? 'text-yellow-400'
                                      : 'text-gray-300 hover:text-yellow-300'
                                      } transition-colors`}
                                  >
                                    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                  </button>
                                ))}
                              </div>
                              {ratingSessionId === session.id && professionalRating > 0 && (
                                <button
                                  onClick={handleRateProfessional}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                                >
                                  Calificar Profesional
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}



        {sessions.length === 0 && assignedProfessional && (
          <div className="bg-white rounded-xl shadow-lg p-8 mt-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Historial de Sesiones</h3>
            <p className="text-gray-500 text-center py-4">
              Aún no tienes sesiones registradas con tu profesional. Las sesiones aparecerán aquí una vez que tu profesional las cree.
            </p>
          </div>
        )}
      </div>

      {/* Modal de confirmación para nueva evaluación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] shadow-2xl max-w-md w-full animate-fade-in-up relative overflow-hidden">
            <div className="mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                ¿Estás seguro?
              </h3>
              <p className="text-gray-600 text-center">
                ¿Estás seguro de que deseas abandonar tu progreso con el profesional e iniciar una nueva evaluación?
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelNewEvaluation}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 bg-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNewEvaluation}
                className="flex-1 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para buscar profesionales */}
      {showSearchProfessionalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                ¿No estás conforme con el profesional asignado?
              </h3>
              <p className="text-gray-600 text-center">
                Buscaremos otro profesional que se adecue mejor a tus necesidades específicas.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelSearchProfessional}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSearchProfessional}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Buscar Otro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para elegir tipo de sesión */}
      {showMeetingTypeModal && selectedSessionForType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Elegir Tipo de Sesión
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Tu profesional ha programado una sesión para{' '}
                {selectedSessionForType.scheduledDate
                  ? new Date(selectedSessionForType.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                  : ''}{' '}
                {selectedSessionForType.scheduledTime ? `a las ${selectedSessionForType.scheduledTime}` : ''}.
                Por favor, elige cómo deseas realizar la sesión:
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedMeetingType('virtual')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${selectedMeetingType === 'virtual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${selectedMeetingType === 'virtual'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                    }`}>
                    {selectedMeetingType === 'virtual' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Virtual</p>
                    <p className="text-xs text-gray-600">Videollamada (Meet, Zoom, etc.)</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedMeetingType('presencial')}
                className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${selectedMeetingType === 'presencial'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                <div className="flex items-center">
                  <div className={`w-4 h-4 rounded-full border-2 mr-3 ${selectedMeetingType === 'presencial'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                    }`}>
                    {selectedMeetingType === 'presencial' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Presencial</p>
                    <p className="text-xs text-gray-600">En la clínica del profesional</p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowMeetingTypeModal(false);
                  setSelectedSessionForType(null);
                  setSelectedMeetingType('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleChooseMeetingType}
                disabled={!selectedMeetingType}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Sesión */}
      {showSessionDetailsModal && selectedSessionForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Detalles de la Sesión</h3>
              <button
                onClick={() => {
                  setShowSessionDetailsModal(false);
                  setSelectedSessionForDetails(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Tipo de sesión */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Tipo de Sesión</p>
                <p className="text-sm text-gray-900">
                  {selectedSessionForDetails.sessionType === 'consultation' ? 'Consulta' :
                    selectedSessionForDetails.sessionType === 'evaluation' ? 'Evaluación' :
                      selectedSessionForDetails.sessionType === 'follow-up' ? 'Seguimiento' :
                        selectedSessionForDetails.sessionType === 'therapy' ? 'Terapia' :
                          selectedSessionForDetails.sessionType}
                </p>
              </div>

              {/* Fecha y hora programada */}
              {selectedSessionForDetails.scheduledDate && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Fecha Programada</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedSessionForDetails.scheduledDate + 'T00:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                    {selectedSessionForDetails.scheduledTime && ` a las ${selectedSessionForDetails.scheduledTime}`}
                  </p>
                </div>
              )}

              {/* Tipo de reunión */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Modalidad</p>
                <p className="text-sm text-gray-900 capitalize">
                  {selectedSessionForDetails.meetingType === 'virtual' ? 'Virtual' : 'Presencial'}
                </p>
              </div>

              {/* Enlace o Ubicación */}
              {selectedSessionForDetails.meetingType === 'virtual' && selectedSessionForDetails.meetingLink && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Enlace de la Reunión</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <a
                      href={selectedSessionForDetails.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 break-all text-sm font-medium flex items-center"
                    >
                      {selectedSessionForDetails.meetingLink}
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSessionForDetails.meetingLink);
                      toast.success('Enlace copiado al portapapeles');
                    }}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    📋 Copiar enlace
                  </button>
                </div>
              )}

              {selectedSessionForDetails.meetingType === 'presencial' && selectedSessionForDetails.meetingLocation && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Ubicación de la Clínica</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{selectedSessionForDetails.meetingLocation}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedSessionForDetails.meetingLocation);
                      toast.success('Ubicación copiada al portapapeles');
                    }}
                    className="mt-2 text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    📋 Copiar ubicación
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowSessionDetailsModal(false);
                  setSelectedSessionForDetails(null);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Button */}
      <ChatButton
        unreadCount={conversations?.filter(c => c.unreadCount?.[currentUser?.uid] > 0).length || 0}
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
          <ChatContainer userId={currentUser?.uid} userType="user" initialConversationId={activeChatId} />
        </div>
      </Modal>
    </div>
  );
};

export default UserDashboard;
