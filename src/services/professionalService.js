import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { onSnapshot } from 'firebase/firestore';

// Función auxiliar para obtener el nombre del usuario por ID
const getUserName = async (userId) => {
  if (!userId || userId === 'unknown') return 'Sistema';
  
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.name || userData.displayName || userId;
    }
    return userId; // Fallback al ID si no se encuentra el usuario
  } catch (error) {
    console.error('Error al obtener nombre del usuario:', error);
    return userId; // Fallback al ID en caso de error
  }
};

// Obtener todos los profesionales activos
export const getActiveProfessionals = async () => {
  try {
    // Primero obtener todos los profesionales sin filtros complejos
    const q = query(
      collection(db, 'professionals'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const professionals = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // Filtrar solo los activos y agregar profId
      if (data.status === 'active') {
        professionals.push({ 
          profId: doc.id,
          ...data 
        });
      }
    });
    
    // Ordenar por rating en el cliente
    professionals.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    return { success: true, professionals };
  } catch (error) {
    console.error('Error al obtener profesionales:', error);
    return { success: false, error: error.message };
  }
};

// Obtener profesional específico
export const getProfessional = async (profId) => {
  try {
    const profDoc = await getDoc(doc(db, 'professionals', profId));
    if (profDoc.exists()) {
      const profData = profDoc.data();
      
      // Obtener nombres de usuarios
      const createdByName = await getUserName(profData.createdBy);
      const updatedByName = await getUserName(profData.updatedBy);
      const verifiedByName = await getUserName(profData.verifiedBy);
      
      return { 
        success: true, 
        professional: { 
          profId: profDoc.id,
          ...profData,
          createdByName,
          updatedByName,
          verifiedByName
        } 
      };
    } else {
      return { success: false, error: 'Profesional no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener profesional:', error);
    return { success: false, error: error.message };
  }
};

// Obtener profesionales por especialidad
export const getProfessionalsBySpecialty = async (speciality) => {
  try {
    const q = query(
      collection(db, 'professionals'),
      where('speciality', '==', speciality), // Usando 'speciality' como en tu estructura
      where('status', '==', 'active'),
      orderBy('rating', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const professionals = [];
    
    querySnapshot.forEach((doc) => {
      professionals.push({ 
        profId: doc.id, // Usando profId como ID del documento
        ...doc.data() 
      });
    });
    
    return { success: true, professionals };
  } catch (error) {
    console.error('Error al obtener profesionales por especialidad:', error);
    return { success: false, error: error.message };
  }
};

// Obtener reviews de un profesional (subcolección)
export const getProfessionalReviews = async (profId) => {
  try {
    const reviewsQuery = query(
      collection(db, 'professionals', profId, 'reviews'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    const reviews = [];
    
    querySnapshot.forEach((doc) => {
      reviews.push({ 
        reviewId: doc.id,
        ...doc.data() 
      });
    });
    
    return { success: true, reviews };
  } catch (error) {
    console.error('Error al obtener reviews del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Agregar review a un profesional
export const addProfessionalReview = async (profId, reviewData) => {
  try {
    const reviewToAdd = {
      ...reviewData,
      createdAt: new Date()
    };
    
    const docRef = await addDoc(
      collection(db, 'professionals', profId, 'reviews'), 
      reviewToAdd
    );
    
    // Actualizar la calificación promedio del profesional
    await updateProfessionalRating(profId);
    
    return { success: true, reviewId: docRef.id };
  } catch (error) {
    console.error('Error al agregar review:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar la calificación promedio de un profesional
export const updateProfessionalRating = async (profId) => {
  try {
    // Obtener todas las reseñas del profesional
    const reviewsQuery = query(
      collection(db, 'professionals', profId, 'reviews')
    );
    
    const querySnapshot = await getDocs(reviewsQuery);
    
    if (querySnapshot.empty) {
      // Si no hay reseñas, establecer calificación en 0
      await updateDoc(doc(db, 'professionals', profId), {
        rating: 0,
        ratingCount: 0,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    }
    
    // Calcular la suma y cantidad de calificaciones
    let totalRating = 0;
    let ratingCount = 0;
    
    querySnapshot.forEach((doc) => {
      const reviewData = doc.data();
      if (reviewData.rating && typeof reviewData.rating === 'number') {
        totalRating += reviewData.rating;
        ratingCount++;
      }
    });
    
    // Calcular promedio (sumatoria / cantidad)
    const averageRating = ratingCount > 0 ? totalRating / ratingCount : 0;
    
    // Actualizar el profesional con la nueva calificación
    await updateDoc(doc(db, 'professionals', profId), {
      rating: Math.round(averageRating * 10) / 10, // Redondear a 1 decimal
      ratingCount: ratingCount,
      updatedAt: serverTimestamp()
    });
    
    return { success: true, rating: averageRating, count: ratingCount };
  } catch (error) {
    console.error('Error al actualizar calificación del profesional:', error);
    return { success: false, error: error.message };
  }
};

// Agregar nuevo profesional
export const addProfessional = async (professionalData) => {
  try {
    const profToAdd = {
      ...professionalData,
      createdAt: new Date(),
      status: "active"
    };
    
    const docRef = await addDoc(collection(db, 'professionals'), profToAdd);
    return { success: true, profId: docRef.id };
  } catch (error) {
    console.error('Error al agregar profesional:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar profesional
export const updateProfessional = async (profId, updateData) => {
  try {
    await updateDoc(doc(db, 'professionals', profId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar profesional:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar profesional
export const deleteProfessional = async (profId) => {
  try {
    await deleteDoc(doc(db, 'professionals', profId));
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar profesional:', error);
    return { success: false, error: error.message };
  }
};

// Recalcular calificaciones de todos los profesionales (función de mantenimiento)
export const recalculateAllProfessionalRatings = async () => {
  try {
    // Obtener todos los profesionales
    const professionalsQuery = query(collection(db, 'professionals'));
    const professionalsSnapshot = await getDocs(professionalsQuery);
    
    const results = [];
    
    for (const professionalDoc of professionalsSnapshot.docs) {
      const profId = professionalDoc.id;
      const result = await updateProfessionalRating(profId);
      results.push({
        profId,
        ...result
      });
    }
    
    return { success: true, results };
  } catch (error) {
    console.error('Error al recalcular calificaciones:', error);
    return { success: false, error: error.message };
  }
};

// Emparejar usuario con profesional basado en resultados del test
export const matchUserWithProfessional = async (testResults, userPreferences = {}) => {
  try {
    // Obtener todos los profesionales activos
    const professionalsResult = await getActiveProfessionals();
    
    if (!professionalsResult.success) {
      return { success: false, error: 'No se pudieron obtener profesionales' };
    }

    const professionals = professionalsResult.professionals;
    
    if (professionals.length === 0) {
      return { success: false, error: 'No hay profesionales disponibles' };
    }

    // Lógica simple de emparejamiento basada en especialidad
    let matchedProfessional = null;
    
    // Si hay resultados de test, buscar por especialidad
    if (testResults && testResults.testType === 'evaluation') {
      const testId = testResults.testId;
      
      // Mapear test a especialidad (usando 'speciality' como en tu estructura)
      const specialtyMap = {
        'anxietyTest': 'Ansiedad',
        'depressionTest': 'Depresión',
        'stressTest': 'Estrés',
        'moodTest': 'Estado de Ánimo',
        'generalTest': 'General'
      };
      
      const targetSpecialty = specialtyMap[testId] || 'General';
      
      // Buscar profesional con la especialidad específica
      const specialtyProfessionals = professionals.filter(
        prof => prof.speciality === targetSpecialty // Usando 'speciality'
      );
      
      if (specialtyProfessionals.length > 0) {
        // Seleccionar el mejor calificado
        matchedProfessional = specialtyProfessionals[0];
      }
    }
    
    // Si no se encontró por especialidad, seleccionar el mejor calificado
    if (!matchedProfessional) {
      matchedProfessional = professionals[0];
    }
    
    return { 
      success: true, 
      professional: matchedProfessional,
      matchReason: matchedProfessional.speciality || 'Mejor calificado' // Usando 'speciality'
    };
    
  } catch (error) {
    console.error('Error al emparejar usuario con profesional:', error);
    return { success: false, error: error.message };
  }
};

// Escuchar en vivo pacientes asignados a un profesional
export const listenAssignedPatients = (professionalId, callback) => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('matchedProfessional', '==', professionalId));

  return onSnapshot(q, (snapshot) => {
    const patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(patients);
  });
};

// Asignar profesional a usuario
export const assignProfessionalToUser = async (userId, profId) => {
  try {
    // Esta función actualizaría el documento del usuario
    // con el profesional asignado
    const { updateUserData } = await import('./authService');
    
    const result = await updateUserData(userId, {
      matchedProfessional: profId, // Usando el profId
      matchedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error al asignar profesional:', error);
    return { success: false, error: error.message };
  }
};
