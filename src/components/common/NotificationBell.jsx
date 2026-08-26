import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import { useAuth } from '../../contexts/AuthContext';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    console.log('🔔 NotificationBell montado');
    const isAdmin = currentUser?.role === 'admin';

    // Iniciar servicio con delay
    const initTimer = setTimeout(() => {
      console.log(`🚀 Iniciando servicio de notificaciones... (isAdmin: ${isAdmin})`);
      notificationService.startListening(isAdmin);
      setIsLoading(false);
    }, 1000);

    // Suscribirse a cambios de estado
    const unsubscribe = notificationService.onStateChange((state) => {
      console.log('📊 Estado actualizado:', {
        notifications: state.notifications.length,
        unreadCount: state.unreadCount
      });
      setNotifications(state.notifications);
      setUnreadCount(state.unreadCount);
    });

    // Obtener estado inicial
    const initialState = notificationService.getState();
    setNotifications(initialState.notifications);
    setUnreadCount(initialState.unreadCount);

    return () => {
      console.log('🔔 NotificationBell desmontado');
      clearTimeout(initTimer);
      notificationService.stopListening();
      unsubscribe();
    };
  }, []);

  const handleNotificationClick = (notification) => {
    // Marcar como leída
    notificationService.markAsRead(notification.id);

    // Redirigir según el tipo
    if (notification.type === 'new_professional') {
      navigate('/admin?section=professionals');
    } else if (notification.type === 'new_user') {
      navigate('/admin?section=users');
    }

    // Cerrar dropdown
    setShowDropdown(false);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
    setShowDropdown(false);
  };

  const clearAll = () => {
    notificationService.clearAll();
    setShowDropdown(false);
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Hace un momento';

    const now = new Date();
    const time = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInSeconds = Math.floor((now - time) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
    return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_user':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        );
      case 'new_professional':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getNotificationMessage = (notification) => {
    switch (notification.type) {
      case 'new_user':
        return `Nuevo usuario registrado: ${notification.data.name || 'Sin nombre'}`;
      case 'new_professional':
        return `Nuevo profesional registrado: ${notification.data.name || 'Sin nombre'}`;
      default:
        return 'Nueva notificación';
    }
  };

  return (
    <div className="relative">
      {/* Botón de notificaciones */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-full hover:bg-gray-100 transition-colors"
        disabled={isLoading}
      >
        {isLoading ? (
          <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}

        {/* Contador de notificaciones no leídas */}
        {!isLoading && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {showDropdown && (
        <div className="fixed left-[5%] right-[5%] top-20 w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
                {notifications.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {unreadCount} sin leer de {notifications.length} total
                  </p>
                )}
              </div>
              <div className="flex space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary-600 hover:text-primary-800"
                  >
                    Marcar todas como leídas
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={clearAll}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Limpiar historial
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 00-15 0v5h5l-5 5-5-5h5v-5a7.5 7.5 0 0115 0v5z" />
                </svg>
                <p>No hay notificaciones</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((notification, index) => (
                <div
                  key={`${notification.id}-${index}`}
                  onClick={() => handleNotificationClick(notification)}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'bg-white'
                    }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-600'
                          }`}>
                          {getNotificationMessage(notification)}
                        </p>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                      {notification.type === 'new_professional' && (
                        <p className="text-xs text-green-600 mt-1">
                          Requiere verificación
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 10 && (
            <div className="p-3 border-t border-gray-200 text-center">
              <button className="text-sm text-primary-600 hover:text-primary-800">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlay para cerrar el dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default NotificationBell;
