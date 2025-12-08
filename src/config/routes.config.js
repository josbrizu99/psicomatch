/**
 * Configuración centralizada de rutas
 * Define todas las rutas de la aplicación de manera organizada
 */

// Rutas públicas (accesibles sin autenticación)
export const PUBLIC_ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/crear-cuenta',
  PROFESSIONAL_LOGIN: '/professional-login',
  PROFESSIONAL_REGISTER: '/professional-registration'
};

// Rutas protegidas de usuario (requieren autenticación)
export const USER_ROUTES = {
  DASHBOARD: '/dashboard',
  USER_DASHBOARD: '/user-dashboard',
  EVALUATION: '/evaluacion',
  EMOTIONAL_EVALUATION: '/evaluacion-emocional',
  TEST_EVALUATION: '/test-evaluacion',
  RESULTS: '/mis-resultados',
  SESSION_PROGRESS: '/user-session-progress',
  SESSION_HISTORY: '/user-session-history'
};

// Rutas de administrador (requieren rol admin)
export const ADMIN_ROUTES = {
  DASHBOARD: '/admin'
};

// Rutas de profesionales (requieren rol professional)
export const PROFESSIONAL_ROUTES = {
  DASHBOARD: '/professional-dashboard'
};

// Rutas de desarrollo y testing (solo en modo desarrollo)
export const DEV_ROUTES = process.env.NODE_ENV === 'development' ? {
  // Estas rutas serán eliminadas en la Fase 8
  // Por ahora las mantenemos para no romper flujos existentes
} : {};

/**
 * Rutas que no deben mostrar Navbar/Footer
 * Útil para dashboards y páginas especiales
 */
export const ROUTES_WITHOUT_LAYOUT = [
  ADMIN_ROUTES.DASHBOARD,
  PROFESSIONAL_ROUTES.DASHBOARD,
  PUBLIC_ROUTES.PROFESSIONAL_LOGIN,
  PUBLIC_ROUTES.PROFESSIONAL_REGISTER,
  ...Object.values(DEV_ROUTES)
];

/**
 * Verifica si una ruta debe mostrar el layout (Navbar/Footer)
 * @param {string} pathname - Ruta actual
 * @returns {boolean}
 */
export const shouldShowLayout = (pathname) => {
  return !ROUTES_WITHOUT_LAYOUT.includes(pathname);
};

/**
 * Obtiene todas las rutas de la aplicación
 * @returns {Array<string>}
 */
export const getAllRoutes = () => {
  return [
    ...Object.values(PUBLIC_ROUTES),
    ...Object.values(USER_ROUTES),
    ...Object.values(ADMIN_ROUTES),
    ...Object.values(PROFESSIONAL_ROUTES),
    ...Object.values(DEV_ROUTES)
  ];
};
