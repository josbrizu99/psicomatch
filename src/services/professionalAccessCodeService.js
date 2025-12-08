import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Generar un nuevo código de acceso de 5 dígitos
export const generateAccessCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// Cambiar código de acceso al inactivar un profesional
export const deactivateProfessionalAccess = async (professionalId) => {
  try {
    console.log('🔄 Desactivando acceso del profesional:', professionalId);
    
    // Generar un código inválido o eliminar el código
    const invalidCode = 'INVALID_' + Date.now();
    
    await updateDoc(doc(db, 'professionals', professionalId), {
      accessCode: invalidCode,
      status: 'inactive',
      deactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Acceso del profesional desactivado');
    return { success: true, message: 'Acceso del profesional desactivado' };
  } catch (error) {
    console.error('❌ Error al desactivar acceso del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Generar nuevo código de acceso al reactivar un profesional
export const reactivateProfessionalAccess = async (professionalId) => {
  try {
    console.log('🔄 Reactivando acceso del profesional:', professionalId);
    
    // Generar un nuevo código de acceso
    const newAccessCode = generateAccessCode();
    
    await updateDoc(doc(db, 'professionals', professionalId), {
      accessCode: newAccessCode,
      status: 'active',
      reactivatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Acceso del profesional reactivado con nuevo código:', newAccessCode);
    return { 
      success: true, 
      message: 'Acceso del profesional reactivado',
      newAccessCode 
    };
  } catch (error) {
    console.error('❌ Error al reactivar acceso del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Verificar si un código de acceso es válido
export const isValidAccessCode = (accessCode) => {
  // Un código válido debe ser de 5 dígitos y no empezar con 'INVALID_'
  return /^\d{5}$/.test(accessCode) && !accessCode.startsWith('INVALID_');
};

// Obtener el código de acceso actual de un profesional
export const getProfessionalAccessCode = async (professionalId) => {
  try {
    const professionalDoc = await getDoc(doc(db, 'professionals', professionalId));
    if (professionalDoc.exists()) {
      const data = professionalDoc.data();
      return { 
        success: true, 
        accessCode: data.accessCode,
        isValid: isValidAccessCode(data.accessCode)
      };
    } else {
      return { success: false, error: 'Profesional no encontrado' };
    }
  } catch (error) {
    console.error('❌ Error al obtener código de acceso:', error);
    return { success: false, error: error.message };
  }
};

// Regenerar código de acceso para un profesional activo
export const regenerateAccessCode = async (professionalId) => {
  try {
    console.log('🔄 Regenerando código de acceso para profesional:', professionalId);
    
    const newAccessCode = generateAccessCode();
    
    await updateDoc(doc(db, 'professionals', professionalId), {
      accessCode: newAccessCode,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Código de acceso regenerado:', newAccessCode);
    return { 
      success: true, 
      message: 'Código de acceso regenerado',
      newAccessCode 
    };
  } catch (error) {
    console.error('❌ Error al regenerar código de acceso:', error);
    return { success: false, error: error.message };
  }
};
