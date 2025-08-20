# 🧠 Psicomatch - Plataforma de Conexión con Psicólogos

## 📋 Descripción

Psicomatch es una plataforma web moderna diseñada para conectar personas con profesionales de salud mental calificados. La aplicación facilita el proceso de encontrar el psicólogo ideal mediante una evaluación emocional personalizada y un sistema de matching inteligente.

## ✨ Características

### 🎯 Funcionalidades Principales
- **Evaluación Emocional Personalizada**: Cuestionarios adaptados para identificar necesidades específicas
- **Sistema de Matching**: Algoritmo inteligente para conectar usuarios con psicólogos especializados
- **Perfiles de Psicólogos Verificados**: Información detallada de profesionales certificados
- **Sesiones Flexibles**: Opciones presenciales y virtuales
- **Autenticación Segura**: Sistema de login/registro con opción de Google OAuth

### 🎨 Diseño y UX
- **Diseño Moderno y Minimalista**: Interfaz limpia con colores suaves (azules y verdes)
- **Responsive Design**: Optimizado para dispositivos móviles y desktop
- **Accesibilidad**: Cumple con estándares de accesibilidad web
- **Animaciones Suaves**: Transiciones y efectos visuales elegantes

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18**: Biblioteca de JavaScript para interfaces de usuario
- **TailwindCSS 3.4.17**: Framework CSS utility-first
- **React Router DOM**: Enrutamiento de aplicaciones React
- **PostCSS**: Procesador de CSS
- **Autoprefixer**: Plugin para prefijos CSS automáticos

### Herramientas de Desarrollo
- **Create React App**: Configuración inicial del proyecto
- **ESLint**: Linter para JavaScript/React
- **npm**: Gestor de paquetes

## 📁 Estructura del Proyecto

```
psicomatch/
├── public/
│   ├── index.html
│   ├── favicon.ico
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── Navbar.jsx          # Barra de navegación principal
│   │   ├── HeroSection.jsx     # Sección principal de la página de inicio
│   │   ├── QuickAccess.jsx     # Sección de acceso rápido
│   │   └── Footer.jsx          # Pie de página
│   ├── pages/
│   │   ├── Home.jsx            # Página principal
│   │   ├── Login.jsx           # Página de inicio de sesión
│   │   ├── CrearCuenta.jsx     # Página de registro
│   │   └── Evaluacion.jsx      # Página de evaluación (placeholder)
│   ├── App.js                  # Componente principal con enrutamiento
│   ├── App.css                 # Estilos globales
│   ├── index.js                # Punto de entrada de la aplicación
│   └── index.css               # Estilos base con TailwindCSS
├── tailwind.config.js          # Configuración de TailwindCSS
├── postcss.config.js           # Configuración de PostCSS
├── package.json                # Dependencias y scripts
└── README.md                   # Documentación del proyecto
```

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js (versión 16 o superior)
- npm (incluido con Node.js)

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd psicomatch
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```

4. **Abrir en el navegador**
   - La aplicación estará disponible en: `http://localhost:3000`

### Scripts Disponibles

```bash
# Iniciar servidor de desarrollo
npm start

# Construir para producción
npm run build

# Ejecutar tests
npm test

# Ejectuar configuración de Create React App
npm run eject
```

## 🎨 Configuración de TailwindCSS

### Colores Personalizados
```javascript
// tailwind.config.js
colors: {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  }
}
```

## 📱 Páginas y Componentes

### 🏠 Página de Inicio (`/`)
- **Hero Section**: Título principal y botones de acción
- **Quick Access**: Enlaces rápidos para login y registro
- **Características**: Información sobre los beneficios de la plataforma

### 🔐 Página de Login (`/login`)
- Formulario de autenticación con email y contraseña
- Opción "Recordarme"
- Enlace "¿Olvidaste tu contraseña?"
- Botón "Continuar con Google" (preparado para implementación)
- Enlace para crear cuenta

### 📝 Página de Registro (`/crear-cuenta`)
- Formulario completo de registro
- Validación de campos en tiempo real
- Confirmación de contraseña
- Aceptación de términos y condiciones
- Botón "Continuar con Google" (preparado para implementación)
- Enlace para iniciar sesión

### 📊 Página de Evaluación (`/evaluacion`)
- **Estado actual**: Placeholder para desarrollo futuro
- **Funcionalidades planificadas**:
  - Cuestionarios personalizados
  - Análisis de necesidades
  - Recomendaciones de psicólogos

## 🔧 Componentes Principales

### Navbar
- Logo de Psicomatch
- Enlaces de navegación
- Menú responsive para móviles
- Botón destacado "Crear Cuenta"

### HeroSection
- Título llamativo con gradiente de colores
- Tres botones de acción principales
- Información de confidencialidad
- Iconos de características principales

### QuickAccess
- Botones grandes para acceso rápido
- Información adicional sobre beneficios
- Diseño con gradientes y efectos hover

### Footer
- Información de contacto
- Enlaces rápidos
- Redes sociales
- Políticas y términos

## 🎯 Funcionalidades Implementadas

### ✅ Completadas
- [x] Diseño responsive completo
- [x] Navegación entre páginas
- [x] Formularios de login y registro
- [x] Validación de formularios
- [x] Botones de Google OAuth (UI)
- [x] Estilos con TailwindCSS
- [x] Componentes reutilizables
- [x] Accesibilidad básica

### 🚧 En Desarrollo
- [ ] Integración con Firebase
- [ ] Autenticación con Google
- [ ] Sistema de evaluación emocional
- [ ] Base de datos de psicólogos
- [ ] Algoritmo de matching

### 📋 Pendientes
- [ ] Backend API
- [ ] Sistema de pagos
- [ ] Chat en tiempo real
- [ ] Calificaciones y reseñas
- [ ] Panel de administración

## 🔒 Seguridad y Privacidad

### Medidas Implementadas
- Validación de formularios en frontend
- Estructura preparada para HTTPS
- Campos de contraseña seguros
- Manejo de datos sensibles

### Próximas Implementaciones
- Autenticación JWT
- Encriptación de datos
- Cumplimiento GDPR
- Auditoría de seguridad

## 📊 Rendimiento

### Optimizaciones Actuales
- Lazy loading de componentes
- Optimización de imágenes
- Minificación de CSS/JS
- Caching de recursos

### Métricas Objetivo
- Tiempo de carga < 3 segundos
- Lighthouse Score > 90
- Core Web Vitals optimizados

## 🧪 Testing

### Estrategia de Testing
- **Unit Tests**: Componentes individuales
- **Integration Tests**: Flujos de usuario
- **E2E Tests**: Casos de uso completos

### Herramientas Planificadas
- Jest para unit testing
- React Testing Library
- Cypress para E2E

## 🚀 Despliegue

### Entornos
- **Desarrollo**: `http://localhost:3000`
- **Staging**: [URL_PENDIENTE]
- **Producción**: [URL_PENDIENTE]

### Plataformas de Despliegue
- Vercel (recomendado)
- Netlify
- AWS Amplify
- Firebase Hosting

## 🤝 Contribución

### Guías de Contribución
1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

### Estándares de Código
- ESLint configurado
- Prettier para formateo
- Conventional Commits
- Code review obligatorio


---

**Desarrollado con ❤️ para mejorar el acceso a la salud mental**
