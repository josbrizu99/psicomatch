import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Servicio para gestionar reviews y calificaciones de profesionales
 */
class ReviewService {
  /**
   * Crear una nueva review para un profesional
   */
  async createReview(professionalId, userId, sessionId, rating, comment) {
    try {
      // Validar rating
      if (rating < 1 || rating > 5) {
        throw new Error('Rating debe estar entre 1 y 5');
      }

      // Crear review
      const reviewRef = await addDoc(collection(db, 'reviews'), {
        professionalId,
        userId,
        sessionId,
        rating,
        comment,
        createdAt: serverTimestamp(),
        helpful: 0,
        reported: false
      });

      // Actualizar estadísticas del profesional
      await this.updateProfessionalRating(professionalId);

      return reviewRef.id;
    } catch (error) {
      console.error('Error creando review:', error);
      throw error;
    }
  }

  /**
   * Obtener reviews de un profesional
   */
  async getProfessionalReviews(professionalId, limit = 10) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('professionalId', '==', professionalId),
        where('reported', '==', false)
      );

      const snapshot = await getDocs(q);
      const reviews = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Ordenar por fecha (más recientes primero)
      reviews.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

      return reviews.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo reviews:', error);
      throw error;
    }
  }

  /**
   * Actualizar rating promedio del profesional
   */
  async updateProfessionalRating(professionalId) {
    try {
      const reviews = await this.getProfessionalReviews(professionalId, 1000);
      
      if (reviews.length === 0) return;

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      await updateDoc(doc(db, 'professionals', professionalId), {
        averageRating: averageRating.toFixed(2),
        totalReviews: reviews.length,
        ratingDistribution: this.calculateRatingDistribution(reviews)
      });
    } catch (error) {
      console.error('Error actualizando rating:', error);
      throw error;
    }
  }

  /**
   * Calcular distribución de ratings (1-5 estrellas)
   */
  calculateRatingDistribution(reviews) {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    reviews.forEach(review => {
      distribution[review.rating]++;
    });

    return distribution;
  }

  /**
   * Marcar review como útil
   */
  async markAsHelpful(reviewId) {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        helpful: increment(1)
      });
    } catch (error) {
      console.error('Error marcando review como útil:', error);
      throw error;
    }
  }

  /**
   * Reportar review inapropiada
   */
  async reportReview(reviewId, reason) {
    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        reported: true,
        reportReason: reason,
        reportedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error reportando review:', error);
      throw error;
    }
  }

  /**
   * Verificar si usuario ya dejó review para este profesional en esta sesión
   */
  async hasUserReviewed(userId, professionalId, sessionId) {
    try {
      const q = query(
        collection(db, 'reviews'),
        where('userId', '==', userId),
        where('professionalId', '==', professionalId),
        where('sessionId', '==', sessionId)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error verificando review:', error);
      return false;
    }
  }
}

export default new ReviewService();
