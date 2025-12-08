import { 
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

// Función para crear usuario administrador
export const createAdminUser = async (email, password, name) => {
  try {
    // Crear usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Crear documento del usuario admin en Firestore
    const adminData = {
      name: name,
      email: email,
      createdAt: serverTimestamp(), // Usando 'createdAt' como en tu estructura
      status: "active",
      role: "admin", // Rol de administrador
      testProgress: "null", // Usando string "null" como en tu estructura
      matchedProfessional: "null", // Usando string "null" como en tu estructura
      photoURL: null // Campo adicional que tienes en tu estructura
    };

    await setDoc(doc(db, 'users', user.uid), adminData);

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email:', email);
    console.log('🔑 Contraseña:', password);
    console.log('👤 Nombre:', name);
    console.log('🆔 UID:', user.uid);

    return { 
      success: true, 
      user,
      message: 'Usuario administrador creado exitosamente'
    };
  } catch (error) {
    console.error('❌ Error al crear usuario administrador:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Función para crear admin desde la consola del navegador
export const createAdminFromConsole = () => {
  const adminEmail = 'admin@psicomatch.com';
  const adminPassword = 'Admin123!';
  const adminName = 'Administrador Psicomatch';

  console.log('🔧 Creando usuario administrador...');
  console.log('📧 Email:', adminEmail);
  console.log('🔑 Contraseña:', adminPassword);
  console.log('👤 Nombre:', adminName);

  createAdminUser(adminEmail, adminPassword, adminName)
    .then(result => {
      if (result.success) {
        console.log('✅ Usuario administrador creado exitosamente!');
        console.log('🎯 Ahora puedes iniciar sesión con:');
        console.log('   Email: admin@psicomatch.com');
        console.log('   Contraseña: Admin123!');
      } else {
        console.error('❌ Error:', result.error);
      }
    })
    .catch(error => {
      console.error('❌ Error inesperado:', error);
    });
};

// Función para verificar si ya existe un admin
export const checkAdminExists = async () => {
  try {
    // Intentar iniciar sesión con las credenciales de admin
    const { signInWithEmailAndPassword } = await import('firebase/auth');
    const { getCurrentUser } = await import('../services/authService');
    
    const adminEmail = 'admin@psicomatch.com';
    const adminPassword = 'Admin123!';

    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    const currentUser = getCurrentUser();
    
    if (currentUser) {
      console.log('✅ Usuario administrador ya existe');
      return true;
    }
    
    return false;
  } catch (error) {
    console.log('ℹ️ Usuario administrador no existe o credenciales incorrectas');
    return false;
  }
};
