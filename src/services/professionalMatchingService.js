import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  orderBy,
  limit,
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { serverTimestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();


// Función para normalizar especialidades
const normalizeSpecialties = (specialties) => {
  if (!Array.isArray(specialties)) return ['general'];
  
  return specialties.map(specialty => 
    specialty.toLowerCase()
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .trim()
  );
};

// Función para calcular puntuación de compatibilidad
const calculateCompatibilityScore = (professional, testSpecialties, userResults, userId) => {
  let score = 0;
  
  // 1. Compatibilidad de especialidades (35% del peso)
  const profSpecialties = normalizeSpecialties(professional.specialities || []);
  const testSpecialtiesNormalized = normalizeSpecialties(testSpecialties);
  
  let specialtyMatch = 0;
  testSpecialtiesNormalized.forEach(testSpecialty => {
    profSpecialties.forEach(profSpecialty => {
      if (profSpecialty.includes(testSpecialty) || testSpecialty.includes(profSpecialty)) {
        specialtyMatch += 1;
      }
    });
  });
  
  score += (specialtyMatch / testSpecialtiesNormalized.length) * 35;
  
  // 2. Calificación del profesional (20% del peso)
  const rating = professional.rating || 0;
  const ratingCount = professional.ratingCount || 0;
  
  // Solo considerar calificación si tiene al menos 3 reseñas
  if (ratingCount >= 3) {
    score += (rating / 5) * 20;
  } else {
    // Si no tiene suficientes reseñas, dar puntuación neutral
    score += 10;
  }
  
  // 3. Disponibilidad (20% del peso) - Mayor peso para profesionales realmente disponibles
  if (professional.availability?.isAvailable === true && professional.status === 'active') {
    score += 20;
  } else if (professional.availability?.isAvailable === true) {
    score += 12;
  } else {
    score += 0;
  }
  
  // 4. Carga de trabajo (10% del peso) - Preferir profesionales con menos usuarios asignados
  const currentAssignments = professional.currentAssignments || 0;
  if (currentAssignments === 0) {
    score += 10;
  } else if (currentAssignments <= 5) {
    score += 7;
  } else if (currentAssignments <= 10) {
    score += 3;
  } else if (currentAssignments > 15) {
    score -= 5; // Penalizar si está sobrecargado
  }
  
  // 5. Experiencia (10% del peso)
  const experienceYears = parseInt(professional.exprecienceYears || professional.experienceYears) || 0;
  if (experienceYears >= 5) {
    score += 10;
  } else if (experienceYears >= 3) {
    score += 7;
  } else if (experienceYears >= 1) {
    score += 4;
  } else {
    score += 1;
  }
  
  // 6. Modalidades de atención (5% del peso)
  const modalities = professional.modalities || {};
  if (modalities.online || modalities.inPerson || modalities.hybrid) {
    score += 5;
  }
  
  // 7. Diversidad de asignaciones - Bonus aleatorio más pequeño para no distorsionar el score
  const diversityBonus = Math.random() * 5;
  score += diversityBonus;
  
  return Math.min(score, 100);
};

// Buscar profesional disponible para un usuario
export const findMatchingProfessional = async (userId, testSpecialties, userResults) => {
  try {
    console.log('🔍 Buscando profesional para usuario:', { userId, testSpecialties, userResults });
    
    // Buscar todos los profesionales activos y verificados
    const professionalsRef = collection(db, 'professionals');
    const q = query(
      professionalsRef,
      where('status', '==', 'active'),
      where('isVerified', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ No se encontraron profesionales activos');
      await updateDoc(doc(db, 'users', userId), {
        matchedProfessional: 'no_available_professionals',
        updatedAt: serverTimestamp(),
      });
      return { success: false, error: 'No hay profesionales disponibles en este momento.' };
    }
    
    const professionals = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('📋 Profesionales encontrados:', professionals.length);
    
    // Calcular puntuación de compatibilidad para cada profesional
    const professionalsWithScores = professionals.map(professional => {
      const compatibilityScore = calculateCompatibilityScore(professional, testSpecialties, userResults, userId);
      return {
        ...professional,
        compatibilityScore
      };
    });
    
    // Filtrar profesionales disponibles y ordenar por puntuación de compatibilidad
    const availableProfessionals = professionalsWithScores
      .filter(professional => professional.availability?.isAvailable === true)
      .sort((a, b) => b.compatibilityScore - a.compatibilityScore);
    
    console.log('🎯 Profesionales disponibles con puntuaciones:', availableProfessionals.length);
    console.log('📊 Puntuaciones:', availableProfessionals.map(p => ({ name: p.name, score: p.compatibilityScore.toFixed(2) })));
    
    if (availableProfessionals.length === 0) {
      console.log('⚠️ No hay profesionales disponibles, buscando cualquier profesional activo...');
      
      // Si no hay profesionales disponibles, usar el mejor profesional activo
      const bestInactiveProfessional = professionalsWithScores
        .sort((a, b) => b.compatibilityScore - a.compatibilityScore)[0];
      
      if (bestInactiveProfessional) {
        await updateDoc(doc(db, 'users', userId), {
          matchedProfessional: bestInactiveProfessional.id,
          professionalMatches: (userResults.professionalMatches || 0) + 1,
          updatedAt: serverTimestamp(),
        });
        
        console.log('✅ Profesional asignado (no disponible):', bestInactiveProfessional.name);
        return { 
          success: true, 
          professional: bestInactiveProfessional,
          warning: 'Profesional asignado pero no disponible en este momento'
        };
      }
      
      await updateDoc(doc(db, 'users', userId), {
        matchedProfessional: 'no_available_professionals',
        updatedAt: serverTimestamp(),
      });
      return { success: false, error: 'No hay profesionales disponibles en este momento.' };
    }
    
    // Implementar selección diversa: elegir entre los mejores 3 profesionales
    const topCandidates = availableProfessionals.slice(0, Math.min(3, availableProfessionals.length));
    
    // Si hay múltiples candidatos con puntuaciones similares, elegir aleatoriamente
    let selectedProfessional;
    if (topCandidates.length === 1) {
      selectedProfessional = topCandidates[0];
    } else {
      // Calcular pesos basados en las puntuaciones
      const totalScore = topCandidates.reduce((sum, p) => sum + p.compatibilityScore, 0);
      const weights = topCandidates.map(p => p.compatibilityScore / totalScore);
      
      // Selección ponderada aleatoria
      const random = Math.random();
      let cumulativeWeight = 0;
      
      for (let i = 0; i < topCandidates.length; i++) {
        cumulativeWeight += weights[i];
        if (random <= cumulativeWeight) {
          selectedProfessional = topCandidates[i];
          break;
        }
      }
      
      // Fallback al primer candidato si algo sale mal
      if (!selectedProfessional) {
        selectedProfessional = topCandidates[0];
      }
    }
    
    console.log('🎯 Profesional seleccionado:', selectedProfessional.name, 'Puntuación:', selectedProfessional.compatibilityScore.toFixed(2));
    console.log('📊 Candidatos considerados:', topCandidates.map(p => ({ name: p.name, score: p.compatibilityScore.toFixed(2) })));
    
    // Actualizar el documento del usuario
    await updateDoc(doc(db, 'users', userId), {
      matchedProfessional: selectedProfessional.id,
      professionalMatches: (userResults.professionalMatches || 0) + 1,
      updatedAt: serverTimestamp(),
    });
    
    console.log('✅ Profesional asignado:', selectedProfessional.name, 'Puntuación:', selectedProfessional.compatibilityScore.toFixed(2));

    // Obtener datos del usuario para el email
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      // Extraer necesidades del usuario desde múltiples campos posibles
      const specialtyNeeds = (
        userResults?.recommendedSpecialties ||
        userResults?.interpretation?.recommendedSpecialties ||
        userResults?.specialties ||
        userData?.recommendedSpecialties ||
        []
      ).filter(s => s && s.toString().trim() !== '');

      // Notificar al usuario
      const sendMatchUser = httpsCallable(functions, 'sendMatchNotificationUser');
      sendMatchUser({
        userEmail: userData?.email,
        userName: userData?.name || 'usuario',
        professionalName: selectedProfessional.fullName || selectedProfessional.name,
        professionalSpecialty: (selectedProfessional.specialities || [])[0] || 'Psicología General',
        compatibilityScore: selectedProfessional.compatibilityScore,
      }).catch((e) => console.warn('Email match usuario fallido:', e.message));

      // Notificar al profesional (Email)
      const sendMatchProfessional = httpsCallable(functions, 'sendMatchNotificationProfessional');
      sendMatchProfessional({
        professionalEmail: selectedProfessional.email || selectedProfessional.contact?.email,
        professionalName: selectedProfessional.fullName || selectedProfessional.name,
        userName: userData?.name || 'usuario',
        userSpecialtyNeeds: specialtyNeeds,
      }).catch((e) => console.warn('Email match profesional fallido:', e.message));

      // Guardar notificación persistente en la BD para el profesional
      try {
        const notificationsRef = collection(db, 'professionals', selectedProfessional.id, 'notifications');
        await addDoc(notificationsRef, {
          type: 'new_patient_assigned',
          title: 'Nuevo paciente asignado',
          message: `${userData?.name || userData?.email || 'Un usuario'} ha sido asignado como tu paciente.`,
          patientId: userId,
          timestamp: serverTimestamp(),
          read: false
        });
        console.log('✅ Notificación persistente guardada para el profesional.');
      } catch (notifErr) {
        console.warn('❌ Error al guardar notificación en BD:', notifErr.message);
      }
    } catch (emailErr) {
      console.warn('Error al enviar emails de match u obtener datos de usuario:', emailErr.message);
    }

    return { 
      success: true, 
      professional: selectedProfessional,
      compatibilityScore: selectedProfessional.compatibilityScore
    };
    
  } catch (error) {
    console.error('❌ Error al buscar profesional:', error);
    try {
      await updateDoc(doc(db, 'users', userId), {
        matchedProfessional: 'error_matching',
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      console.error('Error al actualizar estado de error:', updateError);
    }
    return { success: false, error: error.message };
  }
};

// Obtener datos del profesional asignado
export const getAssignedProfessional = async (professionalId) => {
  try {
    const professionalDoc = await getDoc(doc(db, 'professionals', professionalId));
    if (professionalDoc.exists()) {
      return { success: true, data: { id: professionalDoc.id, ...professionalDoc.data() } };
    } else {
      return { success: false, error: 'Profesional no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener datos del profesional asignado:', error);
    return { success: false, error: error.message };
  }
};

// Obtener información de contacto del profesional
export const getProfessionalContactInfo = (professional) => {
  if (!professional) return null;
  
  return {
    name: professional.name,
    email: professional.contact?.email || professional.email,
    phone: professional.contact?.phone || professional.phone,
    whatsapp: professional.contact?.whatsapp,
    instagram: professional.contact?.instagram,
    linkedin: professional.contact?.linkedin,
    professionalcode: professional.professionalcode,
    specialties: professional.specialities || [],
    experience: professional.exprecienceYears,
    rating: professional.rating,
    ratingCount: professional.ratingCount,
    modalities: professional.modalities || {},
    availability: professional.availability || {},
    bio: professional.bio
  };
};