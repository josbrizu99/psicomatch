import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import { logoutUser } from '../../services/authService';
import NotificationBell from './NotificationBell';
const Navbar = () => {
  const { currentUser, isUserAdmin, userData } = useAuth();
  const { isUserProfessional } = useProfessionalAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef(null);

  // Close user dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };
    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isUserMenuOpen]);

  const handleLogout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      setShowLogoutModal(false); // Cerrar modal primero
      await logoutUser();
      console.log('✅ Logout exitoso, navegando...');
      navigate('/');
    } catch (error) {
      console.error('❌ Error al cerrar sesión:', error);
      setShowLogoutModal(false); // Cerrar modal incluso si hay error
    }
  };

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
    setIsUserMenuOpen(false);
    setIsMenuOpen(false);
  };

  const getUserDisplayName = () => {
    if (userData?.name) return userData.name;
    if (currentUser?.displayName) return currentUser.displayName;
    if (currentUser?.email) return currentUser.email.split('@')[0];
    return 'Usuario';
  };

  const getUserPhoto = () => {
    if (userData?.photoURL) return userData.photoURL;
    if (currentUser?.photoURL) return currentUser.photoURL;
    return null;
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    if (name.includes(' ')) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return name.charAt(0).toUpperCase();
  };

  const navigateToDashboard = () => {
    if (isUserAdmin) {
      navigate('/admin');
    } else if (isUserProfessional) {
      navigate('/professional-dashboard');
    } else {
      navigate('/dashboard');
    }
  };

  const handleInicioClick = (e) => {
    if (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProgresoClick = (e) => {
    if (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') {
      e.preventDefault();
      const el = document.getElementById('progreso-sesiones');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-secondary-400 bg-clip-text text-transparent">
                Psicomatch
              </span>
            </Link>
          </div>

          {/* Lado derecho */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {currentUser ? (
              /* ── Usuario logueado: campana + dropdown ── */
              <div className="flex items-center space-x-2 sm:space-x-4">
                <NotificationBell />
                <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 sm:space-x-3 p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center cursor-pointer flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToDashboard();
                    }}
                    title="Ir a mi panel"
                  >
                    {getUserPhoto() ? (
                      <img
                        src={getUserPhoto()}
                        alt={getUserDisplayName()}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-sm font-semibold">
                        {getUserInitials()}
                      </span>
                    )}
                  </div>

                  {/* Nombre usuario - solo desktop */}
                  <div
                    className="hidden md:block text-left cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToDashboard();
                    }}
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isUserAdmin ? 'Administrador' : isUserProfessional ? 'Profesional' : 'Usuario'}
                    </p>
                  </div>

                  {/* Flecha */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown del usuario — ÚNICO menú, funciona en mobile y desktop */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-1 z-50 border border-gray-200 animate-fade-in">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {getUserDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {currentUser.email}
                      </p>
                    </div>

                    {/* Mi Panel */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        navigateToDashboard();
                      }}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Mi Panel
                    </button>

                    {isUserAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Administración
                      </Link>
                    )}

                    <Link
                      to="/configuracion"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </Link>

                    <div className="border-t border-gray-100 mt-1 pt-1">
                      <button
                        onClick={handleLogoutClick}
                        className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
              </div>
            ) : (
              /* ── Sin usuario: botones de auth + hamburguesa mobile ── */
              <>
                <div className="hidden md:flex items-center space-x-3">
                  <Link
                    to="/professional-login"
                    className="text-secondary-600 hover:bg-secondary-50 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 border border-transparent hover:border-secondary-200"
                  >
                    Soy Profesional
                  </Link>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    to="/crear-cuenta"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors duration-200 shadow-sm"
                  >
                    Crear Cuenta
                  </Link>
                </div>

                {/* Hamburguesa — SOLO para invitados en móvil */}
                <button
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Menú móvil — SOLO para invitados (no logueados) */}
        {isMenuOpen && !currentUser && (
          <div className="md:hidden border-t border-gray-200 py-3 animate-fade-in">
            <div className="space-y-1">
              <Link
                to="/professional-login"
                className="block px-3 py-2.5 text-secondary-600 font-medium hover:text-secondary-700 hover:bg-secondary-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Soy Profesional
              </Link>
              <Link
                to="/login"
                className="block px-3 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/crear-cuenta"
                className="block px-3 py-2.5 text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md transition-colors duration-200"
                onClick={() => setIsMenuOpen(false)}
              >
                Crear Cuenta
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmación de cerrar sesión — RESPONSIVE */}
      {showLogoutModal && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowLogoutModal(false);
            }
          }}
        >
          <div className="w-full max-w-sm bg-white rounded-xl shadow-xl p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Cerrar Sesión</h3>
              <div className="mt-2 py-3">
                <p className="text-sm text-gray-500">
                  ¿Estás seguro de que deseas cerrar sesión? Serás redirigido al inicio.
                </p>
              </div>
              <div className="flex items-center justify-center space-x-3 mt-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleLogout}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </nav>

      {/* ═══ Bottom Navigation Bar — solo móvil para usuario regular ═══ */}
      {currentUser && !isUserAdmin && !isUserProfessional && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.05)] z-50 md:hidden">
          <div className="flex items-center justify-around h-16 px-2 safe-area-pb">
            {/* Inicio */}
            <Link
              to="/dashboard"
              onClick={handleInicioClick}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') && window.location.hash !== '#progreso-sesiones' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 ${
                (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') && window.location.hash !== '#progreso-sesiones' ? 'bg-primary-50' : 'bg-transparent'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold leading-tight">Inicio</span>
            </Link>

            {/* Progreso */}
            <Link
              to="/dashboard#progreso-sesiones"
              onClick={handleProgresoClick}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') && window.location.hash === '#progreso-sesiones' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 ${
                (location.pathname === '/dashboard' || location.pathname === '/user-dashboard') && window.location.hash === '#progreso-sesiones' ? 'bg-primary-50' : 'bg-transparent'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold leading-tight">Progreso</span>
            </Link>

            {/* Historial */}
            <Link
              to="/user-session-history"
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                location.pathname === '/user-session-history' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 ${
                location.pathname === '/user-session-history' ? 'bg-primary-50' : 'bg-transparent'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold leading-tight">Historial</span>
            </Link>

            {/* Configuración */}
            <Link
              to="/configuracion"
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
                location.pathname === '/configuracion' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-0.5 ${
                location.pathname === '/configuracion' ? 'bg-primary-50' : 'bg-transparent'
              }`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
              </div>
              <span className="text-[10px] font-semibold leading-tight">Ajustes</span>
            </Link>
          </div>
        </nav>
      )}
    </>
  );
};

export default Navbar;
