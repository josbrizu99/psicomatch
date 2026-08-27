import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listenUserSessions } from '../../services/userSessionsService';
import { toast } from 'react-hot-toast';

const PatientNotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const { currentUser } = useAuth();

  const getReadNotifications = () => {
    try {
      const stored = localStorage.getItem(`read_notifications_${currentUser?.uid}`);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  const saveReadNotifications = (readSet) => {
    try {
      localStorage.setItem(`read_notifications_${currentUser?.uid}`, JSON.stringify(Array.from(readSet)));
    } catch (e) {
      console.error('Error saving read notifications', e);
    }
  };

  useEffect(() => {
    if (!currentUser) return;

    const readNotifications = getReadNotifications();

    const unsubscribe = listenUserSessions(currentUser.uid, (liveSessions) => {
      const newNotifications = [];

      liveSessions.forEach(session => {
        // Notificación: Necesita elegir tipo de sesión
        if (session.status === 'scheduled' && session.requiresPatientChoice && !session.meetingType) {
          const notificationId = `session-${session.id}-choice`;
          const sessionTypeMap = {
            'consultation': 'Consulta',
            'evaluation': 'Evaluación',
            'follow-up': 'Seguimiento',
            'therapy': 'Terapia'
          };

          const scheduledDate = session.scheduledDate?.toDate ? session.scheduledDate.toDate() : (session.scheduledDate ? new Date(session.scheduledDate + 'T00:00:00') : null);
          const formattedDate = scheduledDate 
            ? scheduledDate.toLocaleDateString('es-ES', { 
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

      // Ordenar por timestamp
      newNotifications.sort((a, b) => {
        const aTime = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
        const bTime = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
        return bTime - aTime;
      });

      setNotifications(newNotifications);
    });

    return () => unsubscribe();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-400 hover:text-gray-500 bg-white rounded-full shadow-sm hover:bg-gray-50 border border-gray-200 transition-colors"
      >
        <span className="sr-only">Ver notificaciones</span>
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifications.filter(n => !n.read).length > 0 && (
          <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-400 ring-2 ring-white"></span>
        )}
      </button>

      {showNotifications && (
        <div className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 mt-2 sm:w-96 bg-white rounded-xl shadow-lg border border-gray-100 ring-1 ring-black ring-opacity-5 z-50 sm:transform sm:origin-top-right transition-all">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {notifications.filter(n => !n.read).length} sin leer
                </p>
              </div>
              {notifications.filter(n => !n.read).length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const readNotifications = getReadNotifications();
                    notifications.forEach(n => readNotifications.add(n.id));
                    saveReadNotifications(readNotifications);
                    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                    toast.success('Todas marcadas como leídas');
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => {
                    const readNotifications = getReadNotifications();
                    readNotifications.add(notification.id);
                    saveReadNotifications(readNotifications);
                    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
                    setShowNotifications(false);
                  }}
                >
                  <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {notification.title}
                  </p>
                  <p className={`text-xs mt-1 ${!notification.read ? 'text-gray-800' : 'text-gray-500'}`}>
                    {notification.message}
                  </p>
                  {notification.timestamp && (
                    <p className="text-[10px] text-gray-400 mt-2">
                      {new Date(notification.timestamp?.seconds ? notification.timestamp.seconds * 1000 : notification.timestamp).toLocaleString()}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientNotificationBell;
