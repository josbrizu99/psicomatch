import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { translateAuthError } from '../utils/errorTranslator';

// Proveedor de Google
const googleProvider = new GoogleAuthProvider();

// Configurar Google Auth Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Registrar nuevo usuario con email y contraseña
export const registerUser = async (name, email, password) => {
  try {
    console.log('🔄 Registrando usuario:', { name, email });
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Usuario creado en Auth:', user.uid);
    
    // Actualizar perfil del usuario
    await updateProfile(user, {
      displayName: name
    });
    
    const userData = {
      name: name,
      email: email,
      photoURL: user.photoURL || null,
      role: "user",
      createdAt: serverTimestamp(),
      firstLoginAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      status: "active",
      matchedProfessional: "null",
      testProgress: "null",
      testsCompleted: 0,
      evaluationsCompleted: 0,
      professionalMatches: 0,
      lastTestCompletedAt: null,
      preferences: {
        emailUpdates: true,
        smsUpdates: true,
        notifications: true,
      },
      statistics: {
        totalSessions: 0,
        totalTimeSpent: 0,
        averageSessionRating: 0,
      },
      profileCompleteness: 0,
      // Campos adicionales para compatibilidad
      loginCount: 1,
      daysActive: 1,
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    console.log('📝 Guardando datos en Firestore:', userData);
    await setDoc(doc(db, 'users', user.uid), userData);
    
    console.log('✅ Usuario registrado exitosamente');
    console.log('🔍 Verificando datos guardados...');
    
    // Verificar que se guardó correctamente
    const savedDoc = await getDoc(doc(db, 'users', user.uid));
    if (savedDoc.exists()) {
      const savedData = savedDoc.data();
      console.log('📊 Datos guardados:', {
        name: savedData.name,
        email: savedData.email,
        createdAt: savedData.createdAt,
        hasCreatedAt: !!savedData.createdAt,
        fields: Object.keys(savedData)
      });
    }
    return { success: true, user };
  } catch (error) {
    console.error('❌ Error al registrar usuario:', error);
    const translatedError = translateAuthError(error);
    return { success: false, error: translatedError.message };
  }
};

// Iniciar sesión con email y contraseña
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Actualizar datos de login
    try {
      const userRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userRef);
      let currentLoginCount = 0;
      let currentDaysActive = 0;
      let lastLoginDate = null;

      if (userDoc.exists()) {
        const data = userDoc.data();
        currentLoginCount = data.loginCount || 0;
        currentDaysActive = data.daysActive || 0;
        lastLoginDate = data.lastLoginAt?.toDate?.();
      } else {
        // Si el profesional nunca se autenticó como usuario, crear documento base
        const createdAt = serverTimestamp();
        await setDoc(userRef, {
          name: userCredential.user.displayName || email.split('@')[0],
          email,
          role: 'user',
          createdAt,
          firstLoginAt: createdAt,
          lastLoginAt: createdAt,
          lastActivityAt: createdAt,
          status: 'active',
          matchedProfessional: 'null',
          testProgress: 'null',
          testsCompleted: 0,
          professionalMatches: 0,
          loginCount: 0,
          daysActive: 0,
          profileCompleteness: 0,
          preferences: {
            emailUpdates: true,
            smsUpdates: true,
            notifications: true,
          },
          statistics: {
            totalSessions: 0,
            totalTimeSpent: 0,
            averageSessionRating: 0,
          },
          updatedAt: createdAt,
          updatedBy: 'system'
        }, { merge: true });
      }

      const today = new Date();
      const isNewDay = !lastLoginDate || lastLoginDate.toDateString() !== today.toDateString();

      const updateData = {
        loginCount: currentLoginCount + 1,
        lastLoginAt: serverTimestamp(),
        lastActivityAt: serverTimestamp(),
        status: "active",
        ...(isNewDay && { daysActive: currentDaysActive + 1 })
      };
      
      await updateDoc(userRef, updateData);
      console.log('✅ Datos de login actualizados:', {
        uid,
        email: userCredential.user.email,
        loginCount: currentLoginCount + 1,
        daysActive: isNewDay ? currentDaysActive + 1 : currentDaysActive,
        isNewDay
      });
      
      // Pequeño delay para asegurar que la actualización se complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (updateError) {
      console.error('❌ Error al actualizar datos de login:', updateError);
    }
    
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    const translatedError = translateAuthError(error);
    return { success: false, error: translatedError.message };
  }
};

// Iniciar sesión con Google
export const loginWithGoogle = async () => {
  try {
    console.log('🔄 Iniciando sesión con Google...');
    
    // Verificar que el proveedor esté configurado correctamente
    if (!googleProvider) {
      throw new Error('Google Auth Provider no está configurado');
    }
    
    // Intentar primero con popup
    try {
      console.log('🔄 Intentando con popup...');
      const result = await signInWithPopup(auth, googleProvider);
      
      if (result.user) {
        console.log('✅ Usuario autenticado con Google via popup:', result.user.uid);
        
        // Procesar usuario Google
        await processGoogleUser(result.user);
        
        return { success: true, user: result.user };
      }
    } catch (popupError) {
      console.log('⚠️ Popup falló, intentando con redirección...', popupError.message);
      
      // Si el popup falla, usar redirección
      console.log('🔄 Redirigiendo a Google...');
      await signInWithRedirect(auth, googleProvider);
      
      return { success: true, redirect: true };
    }
  } catch (error) {
    console.error('❌ Error al iniciar sesión con Google:', error);
    
    // Manejar errores específicos de Google Auth
    let errorMessage = 'Error al iniciar sesión con Google';
    
    switch (error.code) {
      case 'auth/operation-not-allowed':
        errorMessage = 'Google Auth no está habilitado en Firebase Console';
        break;
      case 'auth/popup-closed-by-user':
        errorMessage = 'Inicio de sesión cancelado por el usuario';
        break;
      case 'auth/popup-blocked':
        errorMessage = 'Popup bloqueado por el navegador. Permite popups para este sitio';
        break;
      case 'auth/network-request-failed':
        errorMessage = 'Error de conexión. Verifica tu internet';
        break;
      case 'auth/too-many-requests':
        errorMessage = 'Demasiados intentos. Intenta más tarde';
        break;
      default:
        errorMessage = `Error de Google Auth: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Manejar el resultado de la redirección de Google
export const handleGoogleRedirect = async () => {
  try {
    console.log('🔄 Verificando resultado de redirección de Google...');
    const result = await getRedirectResult(auth);
    
    if (result) {
      const user = result.user;
      console.log('✅ Usuario autenticado con Google via redirección:', {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL
      });
      
      // Procesar usuario Google
      await processGoogleUser(user);
      
      return { success: true, user };
    }
    
    console.log('ℹ️ No se encontró resultado de redirección de Google');
    return { success: false, error: 'No se encontró resultado de redirección' };
  } catch (error) {
    console.error('❌ Error al manejar redirección de Google:', error);
    
    // Manejar errores específicos
    let errorMessage = 'Error al procesar autenticación de Google';
    
    switch (error.code) {
      case 'auth/account-exists-with-different-credential':
        errorMessage = 'Ya existe una cuenta con este email usando otro método de inicio de sesión';
        break;
      case 'auth/invalid-credential':
        errorMessage = 'Credenciales de Google inválidas';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Google Auth no está habilitado en Firebase Console';
        break;
      case 'auth/user-disabled':
        errorMessage = 'Esta cuenta de Google está deshabilitada';
        break;
      default:
        errorMessage = `Error de autenticación: ${error.message}`;
    }
    
    return { success: false, error: errorMessage };
  }
};

// Procesar usuario de Google (crear o actualizar en Firestore)
export const processGoogleUser = async (user) => {
  try {
    console.log('🔄 Procesando usuario de Google:', user.uid);
    
    // Verificar si el usuario ya existe en Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      console.log('📝 Creando nuevo usuario Google en Firestore...');
      // Crear nuevo usuario en Firestore
      const userData = {
        name: user.displayName || 'Usuario Google',
        email: user.email,
        photoURL: user.photoURL,
        role: "user",
        createdAt: serverTimestamp(),
        firstLoginAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
        status: "active",
        matchedProfessional: "null",
        testProgress: "null",
        testsCompleted: 0,
        evaluationsCompleted: 0,
        professionalMatches: 0,
        lastTestCompletedAt: null,
        preferences: {
          emailUpdates: true,
          smsUpdates: true,
          notifications: true,
        },
        statistics: {
          totalSessions: 0,
          totalTimeSpent: 0,
          averageSessionRating: 0,
        },
        profileCompleteness: 0,
        // Campos adicionales para compatibilidad
        loginCount: 1,
        daysActive: 1,
        lastActivityAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ Nuevo usuario Google creado en Firestore');
    } else {
      console.log('🔄 Usuario existente, actualizando datos...');
      // Usuario existente - incrementar contador de inicios de sesión
      const currentLoginCount = userDoc.data().loginCount || 0;
      const updateData = {
        loginCount: currentLoginCount + 1,
        lastLoginAt: serverTimestamp(),
        lastActivityAt: serverTimestamp()
      };
      
      // Actualizar foto de perfil si cambió o si no existe
      const currentPhotoURL = userDoc.data().photoURL;
      if (user.photoURL && (user.photoURL !== currentPhotoURL || !currentPhotoURL)) {
        updateData.photoURL = user.photoURL;
        console.log('🔄 Actualizando foto de perfil:', {
          old: currentPhotoURL,
          new: user.photoURL
        });
      }
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      console.log('✅ Contador de inicios de sesión incrementado (Google):', currentLoginCount + 1);
      
      // Pequeño delay para asegurar que la actualización se complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error al procesar usuario de Google:', error);
    return { success: false, error: error.message };
  }
};

// Cerrar sesión
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    return { success: false, error: error.message };
  }
};

// Obtener datos del usuario desde Firestore
export const getUserData = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { success: true, data: { id: userDoc.id, ...userDoc.data() } };
    } else {
      return { success: false, error: 'Usuario no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    return { success: false, error: error.message };
  }
};

// Verificar si el usuario es administrador
export const isAdmin = async (userId) => {
  try {
    const userData = await getUserData(userId);
    
    if (userData.success) {
      const isAdminRole = userData.data.role === 'admin';
      return isAdminRole;
    }
    return false;
  } catch (error) {
    console.error('Error al verificar rol de administrador:', error);
    return false;
  }
};

// Escuchar cambios en el estado de autenticación
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Actualizar datos del usuario
export const updateUserData = async (userId, updateData) => {
  try {
    await updateDoc(doc(db, 'users', userId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar datos del usuario:', error);
    return { success: false, error: error.message };
  }
};

// Vincular cuenta de Google a usuario existente
export const linkGoogleAccount = async (email, password) => {
  try {
    // Primero iniciar sesión con email/contraseña
    const emailResult = await loginUser(email, password);
    if (!emailResult.success) {
      return emailResult;
    }
    
    // Luego vincular con Google
    const googleResult = await loginWithGoogle();
    if (!googleResult.success) {
      return googleResult;
    }
    
    return { success: true, message: 'Cuenta vinculada exitosamente' };
  } catch (error) {
    console.error('Error al vincular cuenta:', error);
    return { success: false, error: error.message };
  }
};
