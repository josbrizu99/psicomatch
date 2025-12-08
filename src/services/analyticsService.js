import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Servicio para analytics y métricas del sistema
 */
class AnalyticsService {
  /**
   * Obtener métricas generales del sistema
   */
  async getSystemMetrics() {
    try {
      const metrics = {};

      // Total de usuarios
      const usersSnapshot = await getDocs(collection(db, 'users'));
      metrics.totalUsers = usersSnapshot.size;

      // Total de profesionales
      const profsSnapshot = await getDocs(collection(db, 'professionals'));
      metrics.totalProfessionals = profsSnapshot.size;

      // Profesionales activos
      const activeProfessionals = profsSnapshot.docs.filter(
        doc => doc.data().isActive && doc.data().isApproved
      );
      metrics.activeProfessionals = activeProfessionals.length;

      // Total de sesiones
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      metrics.totalSessions = sessionsSnapshot.size;

      // Sesiones completadas
      const completedSessions = sessionsSnapshot.docs.filter(
        doc => doc.data().status === 'completed'
      );
      metrics.completedSessions = completedSessions.length;

      // Total de reviews
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      metrics.totalReviews = reviewsSnapshot.size;

      // Rating promedio global
      if (reviewsSnapshot.size > 0) {
        const totalRating = reviewsSnapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().rating || 0),
          0
        );
        metrics.averageRating = (totalRating / reviewsSnapshot.size).toFixed(2);
      } else {
        metrics.averageRating = 0;
      }

      return metrics;
    } catch (error) {
      console.error('Error obteniendo métricas del sistema:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getUserStats() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Usuarios activos (con última actividad en los últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeUsers = users.filter(user => {
        const lastActive = user.lastLoginAt?.toDate?.() || new Date(0);
        return lastActive > thirtyDaysAgo;
      });

      return {
        total: users.length,
        active: activeUsers.length,
        inactive: users.length - activeUsers.length,
        newThisMonth: users.filter(user => {
          const created = user.createdAt?.toDate?.() || new Date(0);
          const monthAgo = new Date();
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return created > monthAgo;
        }).length
      };
    } catch (error) {
      console.error('Error obteniendo stats de usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de profesionales
   */
  async getProfessionalStats() {
    try {
      const profsSnapshot = await getDocs(collection(db, 'professionals'));
      const profs = profsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const approved = profs.filter(p => p.isApproved);
      const pending = profs.filter(p => !p.isApproved);
      const active = profs.filter(p => p.isActive && p.isApproved);
      const acceptingNew = profs.filter(p => p.acceptingNewPatients && p.isActive);

      // Distribución por especialidad
      const specialtyDistribution = {};
      profs.forEach(prof => {
        // Manejar diferentes formatos/nombres de campo (specialities typo vs specialties correcto)
        const specs = prof.specialities || prof.specialties || (prof.specialty ? [prof.specialty] : []);
        
        if (Array.isArray(specs)) {
          specs.forEach(specialty => {
            if (specialty) {
              specialtyDistribution[specialty] = (specialtyDistribution[specialty] || 0) + 1;
            }
          });
        }
      });

      return {
        total: profs.length,
        approved: approved.length,
        pending: pending.length,
        active: active.length,
        acceptingNew: acceptingNew.length,
        specialtyDistribution
      };
    } catch (error) {
      console.error('Error obteniendo stats de profesionales:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de sesiones
   */
  async getSessionStats() {
    try {
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      const sessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const byStatus = {
        scheduled: sessions.filter(s => s.status === 'scheduled').length,
        completed: sessions.filter(s => s.status === 'completed').length,
        cancelled: sessions.filter(s => s.status === 'cancelled').length,
        inProgress: sessions.filter(s => s.status === 'inProgress').length
      };

      // Sesiones este mes
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const thisMonthSessions = sessions.filter(s => {
        const created = s.createdAt?.toDate?.() || new Date(0);
        return created >= thisMonth;
      });

      return {
        total: sessions.length,
        byStatus,
        thisMonth: thisMonthSessions.length,
        completionRate: sessions.length > 0
          ? ((byStatus.completed / sessions.length) * 100).toFixed(1)
          : 0
      };
    } catch (error) {
      console.error('Error obteniendo stats de sesiones:', error);
      throw error;
    }
  }

  /**
   * Obtener top profesionales por rating
   */
  async getTopProfessionals(limit = 10) {
    try {
      const profsSnapshot = await getDocs(collection(db, 'professionals'));
      const profs = profsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.isActive && p.averageRating);

      // Ordenar por rating
      profs.sort((a, b) => parseFloat(b.averageRating) - parseFloat(a.averageRating));

      return profs.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo top profesionales:', error);
      throw error;
    }
  }

  /**
   * Obtener actividad reciente
   */
  async getRecentActivity(limit = 20) {
    try {
      const activities = [];

      // Últimas reviews
      const reviewsSnapshot = await getDocs(collection(db, 'reviews'));
      reviewsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'review',
          timestamp: data.createdAt,
          data
        });
      });

      // Últimas sesiones
      const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
      sessionsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        activities.push({
          type: 'session',
          timestamp: data.createdAt,
          data
        });
      });

      // Ordenar por fecha
      activities.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeB - timeA;
      });

      return activities.slice(0, limit);
    } catch (error) {
      console.error('Error obteniendo actividad reciente:', error);
      throw error;
    }
  }
  /**
   * Obtener lista completa de usuarios (para tabla/exportar)
   */
  async getAllUsers() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      return usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || data.displayName || 'Sin nombre',
          email: data.email || 'Sin email',
          role: data.role || 'user',
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0),
          status: data.banned ? 'Baneado' : 'Activo'
        };
      });
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      throw error;
    }
  }

  /**
   * Obtener lista completa de sesiones (para tabla/exportar)
   */
  async getAllSessions() {
    try {
      const sessionsSnapshot = await getDocs(query(collection(db, 'sessions'), orderBy('createdAt', 'desc')));
      return sessionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          patientName: data.patientName || 'Paciente',
          professionalName: data.professionalName || 'Profesional',
          date: data.scheduledDate || 'Sin fecha',
          time: data.scheduledTime || 'Sin hora',
          status: data.status || 'pending',
          type: data.meetingType || 'virtual',
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt || 0)
        };
      });
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
