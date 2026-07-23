import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PageLoader from './PageLoader';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const { currentUser, loading, isUserAdmin, userData } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return <PageLoader text="Verificando acceso..." />;
  }

  // Si requiere autenticación y no hay usuario, redirigir a login
  if (requireAuth && !currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere autenticación y tiene 2FA habilitado pero no verificado, redirigir a login
  if (requireAuth && currentUser && userData?.twoFactorEnabled) {
    const isVerified = sessionStorage.getItem(`2fa_verified_${currentUser.uid}`) === 'true';
    if (!isVerified) {
      return <Navigate to="/login" replace />;
    }
  }

  // Si requiere admin y el usuario no es admin, redirigir a home
  if (requireAdmin && !isUserAdmin) {
    return <Navigate to="/" replace />;
  }

  // Si todo está bien, mostrar el contenido
  return children;
};

export default ProtectedRoute;

