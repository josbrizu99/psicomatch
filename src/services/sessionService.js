import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs,
  updateDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Servicio básico para gestión de sesiones
 */
class SessionService {
  /**
   * Crear una nueva sesión
   */
  async createSession(userId, professionalId, sessionData) {
    try {
      const sessionRef = await addDoc(collection(db, 'sessions'), {
        userId,
        professionalId,
        ...sessionData,
        status: 'scheduled',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return sessionRef.id;
    } catch (error) {
      console.error('Error creando sesión:', error);
      throw error;
    }
  }

  /**
   * Obtener sesiones de un usuario
   */
  async getUserSessions(userId, status = null) {
    try {
      let q = query(
        collection(db, 'sessions'),
        where('userId', '==', userId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      throw error;
    }
  }

  /**
   * Obtener sesiones de un profesional
   */
  async getProfessionalSessions(professionalId, status = null) {
    try {
      let q = query(
        collection(db, 'sessions'),
        where('professionalId', '==', professionalId)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      throw error;
    }
  }

  /**
   * Actualizar estado de sesión
   */
  async updateSessionStatus(sessionId, status) {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error actualizando sesión:', error);
      throw error;
    }
  }

  /**
   * Completar sesión
   */
  async completeSession(sessionId, notes = '') {
    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'completed',
        completedAt: serverTimestamp(),
        notes,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error completando sesión:', error);
      throw error;
    }
  }
}

export default new SessionService();
