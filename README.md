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
- **Chat en Tiempo Real**: Comunicación directa y segura entre pacientes y profesionales
- **Dashboard Integral**: Paneles específicos para Pacientes, Profesionales y Administradores

### 🎨 Diseño y UX
- **Diseño Moderno y Minimalista**: Interfaz limpia con colores suaves (azules y verdes)
- **Responsive Design**: Optimizado para dispositivos móviles y desktop
- **Accesibilidad**: Cumple con estándares de accesibilidad web
- **Animaciones Suaves**: Transiciones y efectos visuales elegantes

## 📚 Documentación

El proyecto incluye un manual de usuario detallado para todos los roles:
- **[MANUAL_DE_USUARIO.txt](./MANUAL_DE_USUARIO.txt)**: Guía completa para Pacientes, Profesionales y Administradores.

## 🛠️ Tecnologías Utilizadas

### Frontend
- **React 18**: Biblioteca de JavaScript para interfaces de usuario
- **TailwindCSS 3.4.17**: Framework CSS utility-first
- **React Router DOM**: Enrutamiento de aplicaciones React
- **PostCSS**: Procesador de CSS

### Backend & Servicios
- **Firebase Authentication**: Gestión segura de usuarios y Google Sign-In
- **Cloud Firestore**: Base de datos NoSQL en tiempo real
- **Firebase Hosting**: Despliegue seguro y rápido

### Herramientas de Desarrollo
- **Create React App**: Configuración inicial del proyecto
- **ESLint**: Linter para JavaScript/React
- **npm**: Gestor de paquetes

## 📁 Estructura del Proyecto

```
psicomatch/
├── public/                 # Archivos estáticos
├── src/
│   ├── components/         # Componentes reutilizables
│   │   ├── admin/          # Componentes del panel admin
│   │   ├── chat/           # Componentes de chat en tiempo real
│   │   ├── professional/   # Componentes para profesionales
│   │   └── user/           # Componentes para pacientes
│   ├── pages/              # Páginas principales (Rutas)
│   ├── contexts/           # Contextos de React (Auth, Theme, etc.)
│   ├── hooks/              # Hooks personalizados
│   ├── services/           # Servicios de integración con Firebase
│   └── utils/              # Utilidades y helpers
├── MANUAL_DE_USUARIO.txt   # Manual de usuario detallado
└── README.md               # Documentación general
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

3. **Configurar Variables de Entorno**
   Crear un archivo `.env` en la raíz basado en `.env.example` y configurar las credenciales de Firebase.

4. **Iniciar el servidor de desarrollo**
   ```bash
   npm start
   ```

## 🎯 Funcionalidades Implementadas

### ✅ Completadas
- [x] Diseño responsive completo
- [x] Navegación y Enrutamiento
- [x] Autenticación completa (Email/Password y Google)
- [x] Autenticación de Dos Factores (2FA) para mayor seguridad
- [x] Carga de Fotos de Perfil en Firebase Storage
- [x] Autenticación por roles (Usuario, Profesional, Admin)
- [x] Panel de Administración con métricas y reportes
- [x] Registro y Verificación de Profesionales (datos demográficos completos)
- [x] Muestra de Profesionales Reales en la pantalla principal
- [x] Sistema de Evaluación Emocional y Dashboards de Usuario
- [x] Chat en Tiempo Real
- [x] Integración completa con Firebase (Auth, Firestore, Storage, Functions)
- [x] Generación de Reportes PDF/Excel

### 🚧 En Desarrollo
- [ ] Sistema de videollamadas integrado
- [ ] Pasarela de pagos

## 🔒 Seguridad

- Validaciones robustas en frontend y reglas de seguridad en Firestore.
- Protección de rutas con Higher-Order Components (HOC).
- Manejo seguro de credenciales y sesiones.

## 🤝 Contribución

1. Fork del repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

---

## 👨‍💻 Desarrollador

**José Brizuela**  
*Universitario*  
Ciudad de Villarrica, Guairá, Paraguay

---

**Desarrollado con ❤️ para mejorar el acceso a la salud mental**
