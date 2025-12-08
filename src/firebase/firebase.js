import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
    measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Configuración adicional para evitar errores de init.json
const firebaseAppConfig = {
    ...firebaseConfig,
    // Deshabilitar Firebase Hosting init
    databaseURL: undefined,
    // Configuración específica para desarrollo
    authDomain: "psicomatch2026.firebaseapp.com"
};

// Validar configuración
const validateConfig = (config) => {
    const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
        throw new Error(`Configuración de Firebase incompleta. Campos faltantes: ${missingFields.join(', ')}`);
    }
    
    return true;
};

// Inicializar Firebase con manejo de errores
let app, auth, db, storage, functions;

try {
    // Validar configuración
    validateConfig(firebaseConfig);
    
    // Inicializar Firebase con configuración mejorada
    app = initializeApp(firebaseAppConfig);
    
    // Inicializar servicios
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);
    
    // Configurar auth para evitar errores de init.json
    if (auth) {
        auth.useDeviceLanguage();
    }
    
    console.log('✅ Firebase inicializado correctamente');
    console.log('📊 Proyecto:', firebaseConfig.projectId);
    console.log('🔐 Auth Domain:', firebaseConfig.authDomain);
    
} catch (error) {
    console.error('❌ Error al inicializar Firebase:', error);
    
    // Configuración de fallback para desarrollo
    const fallbackConfig = {
        apiKey: "demo-key",
        authDomain: "demo.firebaseapp.com",
        projectId: "demo-project",
        storageBucket: "demo.appspot.com",
        messagingSenderId: "123456789",
        appId: "1:123456789:web:demo"
    };
    
    try {
        app = initializeApp(fallbackConfig, 'fallback');
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app);
        console.warn('⚠️ Usando configuración de fallback para desarrollo');
    } catch (fallbackError) {
        console.error('❌ Error crítico: No se pudo inicializar Firebase', fallbackError);
        throw new Error('Firebase no pudo inicializarse. Verifica tu configuración.');
    }
}

// Verificar que los servicios estén disponibles
if (!auth) {
    throw new Error('El servicio de autenticación no está disponible');
}

if (!db) {
    throw new Error('El servicio de Firestore no está disponible');
}

if (!storage) {
    throw new Error('El servicio de Storage no está disponible');
}

// Exportar servicios
export { auth, db, storage, functions };
export default app;
