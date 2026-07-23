import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProfessionalAuthProvider } from './contexts/ProfessionalAuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import CrearCuenta from './pages/CrearCuenta';
import Evaluacion from './pages/Evaluacion';
import EvaluationTest from './pages/EvaluationTest';
import UserSessionProgress from './pages/UserSessionProgress';
import UserSessionHistory from './pages/UserSessionHistory';
import ProfessionalLogin from './pages/ProfessionalLogin';
import ProfessionalRegistration from './pages/ProfessionalRegistration';
import UserTestResults from './pages/UserTestResults';
import NotificationBell from './components/common/NotificationBell';
import ProfileWizard from './components/user/ProfileWizard';
import SkeletonLoader from './components/common/SkeletonLoader';
import useProfileCompletion from './hooks/useProfileCompletion';
import { useProfessionalAuth } from './contexts/ProfessionalAuthContext';
import { useAuth } from './contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase/firebase';
import { shouldShowLayout } from './config/routes.config';
import logger from './utils/logger';
import { ThemeProvider } from './contexts/ThemeContext';
import OnboardingTrigger from './components/common/OnboardingTrigger';
import HelpButton from './components/common/HelpButton';
import NotFound from './components/common/NotFound';
import ScrollToTopButton from './components/common/ScrollToTopButton';
import './App.css';

// Code Splitting: Lazy load de componentes grandes para mejorar rendimiento
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ProfessionalDashboard = lazy(() => import('./pages/ProfessionalDashboard'));
const EvaluacionEmocionalPage = lazy(() => import('./pages/EvaluacionEmocionalPage'));
const UserSettings = lazy(() => import('./pages/UserSettings'));

function AppContent() {
  const location = useLocation();
  const { currentUser } = useAuth();
  const { isUserProfessional, loading: professionalLoading } = useProfessionalAuth();
  const { needsCompletion, loading } = useProfileCompletion(isUserProfessional);
  const [profileCompleted, setProfileCompleted] = useState(false);
  
  logger.log('🔍 AppContent - Estado inicial:', { profileCompleted, needsCompletion, loading });
  
  // Log cuando profileCompleted cambie
  useEffect(() => {
    logger.log('🔍 profileCompleted cambió a:', profileCompleted);
  }, [profileCompleted]);
  const [isUserProfessionalDirect, setIsUserProfessionalDirect] = useState(false);

  // Verificar directamente si el usuario es un profesional
  useEffect(() => {
    const checkIfProfessional = async () => {
      if (!currentUser) {
        setIsUserProfessionalDirect(false);
        return;
      }

      try {
        const professionalsRef = collection(db, 'professionals');
        const q = query(professionalsRef, where('email', '==', currentUser.email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          logger.log('🔍 Usuario es profesional (verificación directa en App.js)');
          setIsUserProfessionalDirect(true);
        } else {
          logger.log('🔍 Usuario NO es profesional (verificación directa en App.js)');
          setIsUserProfessionalDirect(false);
        }
      } catch (error) {
        logger.error('❌ Error al verificar si es profesional en App.js:', error);
        setIsUserProfessionalDirect(false);
      }
    };

    checkIfProfessional();
  }, [currentUser]);
  
  
  // Usar shouldShowLayout para determinar si mostrar Navbar/Footer
  const showLayout = shouldShowLayout(location.pathname);

  // Mostrar ProfileWizard si el perfil necesita completarse
  // PERO NO para profesionales
  logger.log(' App.js ProfileWizard check:', {
    needsCompletion,
    loading,
    profileCompleted,
    isUserProfessional,
    professionalLoading,
    isUserProfessionalDirect
  });

  // Verificar si el usuario es un profesional (usar verificación directa como respaldo)
  const isActuallyProfessional = isUserProfessional || isUserProfessionalDirect;

  logger.log('🔍 App.js - Lógica de decisión:', {
    needsCompletion,
    loading,
    profileCompleted,
    isActuallyProfessional,
    condition1: needsCompletion,
    condition2: !loading,
    condition3: !profileCompleted,
    condition4: !isActuallyProfessional,
    allConditions: needsCompletion && !loading && !profileCompleted && !isActuallyProfessional
  });

  const isRegistrationRoute = location.pathname === '/professional-registration' || location.pathname === '/registro-profesional';

  if (needsCompletion && !loading && !profileCompleted && !isRegistrationRoute) {
    logger.log(`✅ Mostrando ProfileWizard para ${isActuallyProfessional ? 'profesional' : 'usuario regular'}`);
    return (
      <ProfileWizard onComplete={() => setProfileCompleted(true)} />
    );
  }

  if (!needsCompletion) {
    logger.log('NO mostrando ProfileWizard - Perfil ya completo');
  }

  if (loading) {
    logger.log('NO mostrando ProfileWizard - Aún cargando');
  }

  if (profileCompleted) {
    logger.log('NO mostrando ProfileWizard - Perfil ya completado en esta sesión');
  }

  return (
    <OnboardingTrigger>
      <div className="App min-h-screen flex flex-col">
        {showLayout && <Navbar />}
        <main className="flex-grow">
          <Suspense fallback={
            <div className="flex justify-center items-center min-h-screen">
              <SkeletonLoader variant="card" width="800px" height="600px" />
            </div>
          }>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/crear-cuenta" element={<CrearCuenta />} />
              <Route path="/professional-login" element={<ProfessionalLogin />} />
              <Route path="/professional-registration" element={<ProfessionalRegistration />} />
              <Route path="/professional-dashboard" element={<ProfessionalDashboard />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/user-dashboard" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/user-session-progress" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <UserSessionProgress />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/user-session-history" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <UserSessionHistory />
                  </ProtectedRoute>
                }
              />
              <Route 
                path="/evaluacion" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <Evaluacion />
                  </ProtectedRoute>
                } 
              />
              <Route path="/evaluacion-emocional" element={
                  <ProtectedRoute requireUser={true}>
                    <EvaluacionEmocionalPage />
                  </ProtectedRoute>
                } />
                <Route path="/configuracion" element={
                  <ProtectedRoute requireUser={true}>
                    <UserSettings />
                  </ProtectedRoute>
                } />
              <Route 
                path="/test-evaluacion" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <EvaluationTest />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/mis-resultados" 
                element={
                  <ProtectedRoute requireAuth={true}>
                    <UserTestResults />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin" 
                element={
                  <ProtectedRoute requireAuth={true} requireAdmin={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              {/* Ruta 404 para cualquier URL no coincidente */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
        {showLayout && <Footer />}
        


        {/* Botón de ayuda flotante */}
        {currentUser && (
          <HelpButton userType={isActuallyProfessional ? 'professional' : 'user'} />
        )}
        
        {/* Botón para volver arriba - Solo en Home */}
        {location.pathname === '/' && <ScrollToTopButton />}
      </div>
    </OnboardingTrigger>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfessionalAuthProvider>
          <Router>
            <AppContent />
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
          </Router>
        </ProfessionalAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
