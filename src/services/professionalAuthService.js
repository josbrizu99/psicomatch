import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  getAuth
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { isValidAccessCode } from './professionalAccessCodeService';
import { translateProfessionalAuthError } from '../utils/errorTranslator';

// Crear cuenta de profesional (solo para administradores)
export const createProfessionalAuth = async (professionalData) => {
  try {
    console.log('🔄 Creando autenticación para profesional:', { email: professionalData.email });
    
    // Guardar el usuario actual del administrador
    const currentUser = auth.currentUser;
    const currentUserUID = currentUser?.uid;
    
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, professionalData.email, professionalData.password);
    const user = userCredential.user;
    
    console.log('✅ Usuario profesional creado en Auth:', user.uid);
    
    // Actualizar perfil del usuario
    await updateProfile(user, {
      displayName: professionalData.fullName
    });
    
    // Guardar datos adicionales en Firestore
    const professionalAuthData = {
      ...professionalData,
      uid: user.uid,
      emailVerified: user.emailVerified,
      lastLoginAt: null,
      loginAttempts: 0,
      lockedUntil: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('📝 Guardando datos del profesional en Firestore:', professionalAuthData);
    await setDoc(doc(db, 'professionals', user.uid), professionalAuthData);
    
    // IMPORTANTE: Cerrar sesión del profesional recién creado para no afectar al admin
    await signOut(auth);
    
    console.log('✅ Profesional creado exitosamente');
    return { 
      success: true, 
      user, 
      professionalData: professionalAuthData,
      adminSessionLost: true, // Indicar que se perdió la sesión del admin
      message: 'Profesional creado exitosamente. Deberás volver a iniciar sesión como administrador.'
    };
  } catch (error) {
    console.error('❌ Error al crear profesional:', error);
    let errorMessage = 'Error al crear la cuenta del profesional';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Este email ya está registrado';
        break;
      case 'auth/weak-password':
        errorMessage = 'La contraseña debe tener al menos 6 caracteres';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Email inválido - Verifica el formato del email';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Registro con email/contraseña no está habilitado';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Error de conexión. Verifica tu internet';
        break;
      default:
        errorMessage = `Error: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Iniciar sesión como profesional
export const loginProfessional = async (email, password, accessCode) => {
  try {
    console.log('🔄 Iniciando sesión profesional:', { email });
    
    // PRIMERO: Verificar datos en Firestore ANTES de autenticar
    const professionalsRef = collection(db, 'professionals');
    const q = query(professionalsRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'No se encontró un profesional con ese email' };
    }

    const professionalDoc = querySnapshot.docs[0];
    const professionalData = professionalDoc.data();
    const professionalId = professionalDoc.id; // Obtener el ID del documento
    
    console.log('🔍 Verificando datos del profesional:', {
      email: professionalData.email,
      status: professionalData.status,
      isVerified: professionalData.isVerified,
      accessCode: professionalData.accessCode
    });

    // Verificar si el profesional está activo
    if (professionalData.status !== 'active') {
      console.log('❌ Profesional inactivo intentando iniciar sesión:', {
        email: professionalData.email,
        status: professionalData.status
      });
      return { success: false, error: 'Tu cuenta está inactiva. Contacta al administrador para activar tu cuenta.' };
    }

    // Verificar si está verificado
    if (!professionalData.isVerified) {
      console.log('❌ Profesional no verificado intentando iniciar sesión:', {
        email: professionalData.email,
        isVerified: professionalData.isVerified
      });
      return { success: false, error: 'Tu cuenta aún no ha sido verificada por el administrador.' };
    }

    // Verificar código de acceso
    if (professionalData.accessCode !== accessCode) {
      console.log('❌ Código de acceso incorrecto:', {
        provided: accessCode,
        expected: professionalData.accessCode
      });
      return { success: false, error: 'Código de acceso incorrecto' };
    }

    // Verificar si el código de acceso es válido (no está desactivado)
    if (!isValidAccessCode(professionalData.accessCode)) {
      console.log('❌ Código de acceso inválido o desactivado:', professionalData.accessCode);
      return { success: false, error: 'Tu código de acceso ha sido desactivado. Contacta al administrador.' };
    }

    // SEGUNDO: Autenticar con Firebase Auth (solo si todas las verificaciones pasan)
    console.log('✅ Todas las verificaciones pasaron, autenticando con Firebase...');
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Usuario autenticado en Firebase Auth:', user.uid);

    // Verificar si está bloqueado
    if (professionalData.lockedUntil && new Date() < professionalData.lockedUntil.toDate()) {
      await signOut(auth);
      return { success: false, error: 'Tu cuenta está temporalmente bloqueada. Intenta más tarde.' };
    }

    // Actualizar último login, incrementar sesiones y limpiar intentos fallidos
    const newTotalSessions = (professionalData.totalSessions || 0) + 1;
    console.log('🔄 Actualizando sesiones:', { 
      currentSessions: professionalData.totalSessions || 0, 
      newSessions: newTotalSessions 
    });
    
    await updateDoc(doc(db, 'professionals', professionalId), {
      lastLoginAt: serverTimestamp(),
      totalSessions: newTotalSessions,
      loginAttempts: 0,
      lockedUntil: null,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Profesional logueado exitosamente, sesiones actualizadas:', newTotalSessions);
    return { success: true, user, professionalData };
    
  } catch (error) {
    console.error('❌ Error al iniciar sesión profesional:', error);
    
    // No intentar actualizar intentos fallidos si no está autenticado
    // Las reglas de Firestore requieren autenticación para escribir
    const translatedError = translateProfessionalAuthError(error);
    return { success: false, error: translatedError.message };
  }
};

// Obtener datos del profesional desde Firestore
export const getProfessionalData = async (userId) => {
  try {
    const professionalDoc = await getDoc(doc(db, 'professionals', userId));
    if (professionalDoc.exists()) {
      return { success: true, data: { id: professionalDoc.id, ...professionalDoc.data() } };
    } else {
      return { success: false, error: 'Profesional no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener datos del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Verificar si el usuario es un profesional
export const isProfessional = async (userId) => {
  try {
    const professionalData = await getProfessionalData(userId);
    return professionalData.success && professionalData.data.status === 'active';
  } catch (error) {
    console.error('Error al verificar si es profesional:', error);
    return false;
  }
};

// Cerrar sesión de profesional
export const logoutProfessional = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Escuchar cambios en el estado de autenticación para profesionales
export const onProfessionalAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Actualizar datos del profesional
export const updateProfessionalData = async (userId, updateData) => {
  try {
    await updateDoc(doc(db, 'professionals', userId), {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar datos del profesional:', error);
    return { success: false, error: error.message };
  }
};

