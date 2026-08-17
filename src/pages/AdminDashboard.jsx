import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { logoutUser } from '../services/authService';
import AdminSidebar from '../components/admin/AdminSidebar';
import DashboardHome from '../components/admin/DashboardHome';
import ManageUsers from '../components/admin/ManageUsers';
import ManageProfessionals from '../components/admin/ManageProfessionals';
import ManageEvaluationTests from '../components/admin/ManageEvaluationTests';
import ManageReports from '../components/admin/ManageReports';
import AdminSettings from '../components/admin/AdminSettings';
import DataSetup from '../components/admin/DataSetup';
import ManageProfessionalAccess from '../components/admin/ManageProfessionalAccess';
import ManageHomeContent from '../components/admin/ManageHomeContent';
import notificationService from '../services/notificationService';

const AdminDashboard = () => {
  const { userData, currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchParams, setSearchParams] = useSearchParams();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
  };

  const handleLogout = async () => {
    try {
      setShowLogoutModal(false);
      await logoutUser();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Manejar parámetros de URL para navegación desde notificaciones
  useEffect(() => {
    const section = searchParams.get('section');
    if (section && ['dashboard', 'users', 'professionals', 'evaluation-tests', 'reports', 'settings', 'data-setup', 'home-content'].includes(section)) {
      setActiveSection(section);
      // Limpiar el parámetro de URL después de usarlo
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Inicializar servicio de notificaciones
  useEffect(() => {
    console.log('🔔 AdminDashboard: Iniciando servicio de notificaciones...');

    // Iniciar servicio con delay
    const initTimer = setTimeout(() => {
      notificationService.startListening();
    }, 1000);

    // Suscribirse a cambios de estado
    const unsubscribe = notificationService.onStateChange((state) => {
      console.log('📊 AdminDashboard: Estado actualizado:', {
        notifications: state.notifications.length,
        unreadCount: state.unreadCount
      });
      setAdminNotifications(state.notifications);
      setUnreadCount(state.unreadCount);
    });

    // Obtener estado inicial
    const initialState = notificationService.getState();
    setAdminNotifications(initialState.notifications);
    setUnreadCount(initialState.unreadCount);

    return () => {
      console.log('🔔 AdminDashboard: Desmontando, limpiando servicio...');
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
      setActiveSection('professionals');
      setShowNotifications(false);
    } else if (notification.type === 'new_user') {
      setActiveSection('users');
      setShowNotifications(false);
    }
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
    toast.success('Todas las notificaciones marcadas como leídas');
    setShowNotifications(false);
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
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'new_professional':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
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

  // Memoizar el contenido para evitar re-renderizados innecesarios
  const renderContent = useMemo(() => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardHome key="dashboard" />;
      case 'users':
        return <ManageUsers key="users" />;
      case 'professionals':
        return <ManageProfessionals key="professionals" />;
      case 'professional-access':
        return <ManageProfessionalAccess key="professional-access" />;
      case 'evaluation-tests':
        return <ManageEvaluationTests key="evaluation-tests" />;
      case 'reports':
        return <ManageReports key="reports" />;
      case 'settings':
        return <AdminSettings key="settings" />;
      case 'data-setup':
        return <DataSetup key="data-setup" />;
      case 'home-content':
        return <ManageHomeContent key="home-content" />;
      default:
        return <DashboardHome key="dashboard-default" />;
    }
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            {/* Botón hamburguesa - solo móvil */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link
              to="/"
              className="flex items-center space-x-2 group"
            >
              <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-lg sm:text-xl font-bold text-teal-700">
                Psicomatch Admin
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
                {unreadCount > 0 && (
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
                          {unreadCount} sin leer
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Marcar todas como leídas
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {adminNotifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">
                        No hay notificaciones
                      </div>
                    ) : (
                      adminNotifications.slice(0, 10).map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {getNotificationMessage(notification)}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                              {notification.type === 'new_professional' && (
                                <p className="text-xs text-green-600 mt-1">
                                  Requiere verificación
                                </p>
                              )}
                            </div>
                            {!notification.isRead && (
                              <span className="ml-2 h-2 w-2 rounded-full bg-blue-500"></span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  {adminNotifications.length > 10 && (
                    <div className="p-3 border-t border-gray-200 text-center">
                      <p className="text-xs text-gray-500">
                        Mostrando 10 de {adminNotifications.length} notificaciones
                      </p>
                    </div>
                  )}
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
              <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-semibold">
                  {userData?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || 'A'}
                </span>
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-900">
                  {userData?.name || 'Administrador'}
                </p>
                <p className="text-xs text-gray-500">
                  {currentUser?.email || 'admin@psicomatch.com'}
                </p>
              </div>
              <button
                onClick={() => setShowLogoutModal(true)}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Cerrar sesión"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex relative min-h-[calc(100vh-64px)] sm:min-h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <AdminSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main Content */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 relative z-10 overflow-auto w-full">
          <div className="min-h-full">
            {renderContent}
          </div>
        </main>
      </div>

      {/* Modal de confirmación de logout */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 sm:p-6 shadow-xl w-full max-w-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Cerrar sesión</h3>
                <p className="text-sm text-gray-500 mt-1">¿Estás seguro de que quieres cerrar sesión?</p>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
