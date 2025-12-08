import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Servicio mejorado de matching con algoritmo de puntuación
 */
class MatchingService {
  /**
   * Calcular score de compatibilidad entre usuario y profesional
   */
  calculateCompatibilityScore(userProfile, professional) {
    let score = 0;
    const weights = {
      specialty: 30,
      experience: 20,
      availability: 15,
      rating: 20,
      price: 10,
      location: 5
    };

    // 1. Especialidad (30 puntos)
    if (professional.specialties?.some(s => 
      userProfile.preferences?.specialties?.includes(s)
    )) {
      score += weights.specialty;
    }

    // 2. Experiencia (20 puntos)
    const yearsExperience = professional.yearsOfExperience || 0;
    if (yearsExperience >= 10) score += weights.experience;
    else if (yearsExperience >= 5) score += weights.experience * 0.7;
    else if (yearsExperience >= 2) score += weights.experience * 0.4;

    // 3. Disponibilidad (15 puntos)
    if (professional.isAvailable && professional.acceptingNewPatients) {
      score += weights.availability;
    }

    // 4. Rating (20 puntos)
    const rating = parseFloat(professional.averageRating) || 0;
    score += (rating / 5) * weights.rating;

    // 5. Precio (10 puntos) - Preferencia de rango de precio
    const userMaxPrice = userProfile.preferences?.maxPrice || Infinity;
    const professionalPrice = professional.sessionPrice || 0;
    if (professionalPrice <= userMaxPrice) {
      score += weights.price;
    } else if (professionalPrice <= userMaxPrice * 1.2) {
      score += weights.price * 0.5;
    }

    // 6. Ubicación (5 puntos) - Si prefiere presencial
    if (userProfile.preferences?.preferInPerson && professional.offersInPerson) {
      score += weights.location;
    } else if (professional.offersOnline) {
      score += weights.location * 0.5;
    }

    return Math.round(score);
  }

  /**
   * Obtener profesionales recomendados para un usuario
   */
  async getRecommendedProfessionals(userId, userProfile, limit = 10) {
    try {
      // Obtener todos los profesionales activos
      const q = query(
        collection(db, 'professionals'),
        where('isActive', '==', true),
        where('isApproved', '==', true)
      );

      const snapshot = await getDocs(q);
      const professionals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcular score para cada profesional
      const scoredProfessionals = professionals.map(prof => ({
        ...prof,
        matchScore: this.calculateCompatibilityScore(userProfile, prof)
      }));

      // Ordenar por score (mayor a menor)
      scoredProfessionals.sort((a, b) => b.matchScore - a.matchScore);

      // Retornar top N
      return scoredProfessionals.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo profesionales recomendados:', error);
      throw error;
    }
  }

  /**
   * Buscar profesionales con filtros
   */
  async searchProfessionals(filters = {}) {
    try {
      let q = collection(db, 'professionals');
      const constraints = [
        where('isActive', '==', true),
        where('isApproved', '==', true)
      ];

      // Aplicar filtros adicionales
      if (filters.specialty) {
        constraints.push(where('specialties', 'array-contains', filters.specialty));
      }

      if (filters.minRating) {
        constraints.push(where('averageRating', '>=', filters.minRating));
      }

      if (filters.acceptingNewPatients) {
        constraints.push(where('acceptingNewPatients', '==', true));
      }

      q = query(q, ...constraints);
      const snapshot = await getDocs(q);

      let professionals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filtros adicionales en memoria (no soportados por Firestore)
      if (filters.maxPrice) {
        professionals = professionals.filter(
          p => (p.sessionPrice || 0) <= filters.maxPrice
        );
      }

      if (filters.offersOnline !== undefined) {
        professionals = professionals.filter(
          p => p.offersOnline === filters.offersOnline
        );
      }

      return professionals;
    } catch (error) {
      console.error('Error buscando profesionales:', error);
      throw error;
    }
  }

  /**
   * Obtener razones del match (para mostrar al usuario)
   */
  getMatchReasons(userProfile, professional, score) {
    const reasons = [];

    if (professional.specialties?.some(s => 
      userProfile.preferences?.specialties?.includes(s)
    )) {
      reasons.push('Especializado en tu área de interés');
    }

    if (professional.averageRating >= 4.5) {
      reasons.push('Altamente calificado por otros pacientes');
    }

    if (professional.yearsOfExperience >= 10) {
      reasons.push('Más de 10 años de experiencia');
    } else if (professional.yearsOfExperience >= 5) {
      reasons.push('Amplia experiencia profesional');
    }

    if (professional.acceptingNewPatients) {
      reasons.push('Aceptando nuevos pacientes');
    }

    if (professional.offersOnline) {
      reasons.push('Ofrece sesiones online');
    }

    if (score >= 80) {
      reasons.unshift('Excelente compatibilidad');
    } else if (score >= 60) {
      reasons.unshift('Buena compatibilidad');
    }

    return reasons;
  }
}

export default new MatchingService();
