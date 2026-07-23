import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const HOME_CONTENT_DOC = 'settings/home_content';

/**
 * Default content to be used if the database document does not exist yet.
 */
export const defaultHomeContent = {
  stats: [
    {
      value: '500+',
      label: 'Profesionales Verificados',
      description: 'Psicólogos certificados listos para ayudarte'
    },
    {
      value: '10,000+',
      label: 'Sesiones Completadas',
      description: 'Miles de personas han encontrado apoyo'
    },
    {
      value: '95%',
      label: 'Satisfacción de Usuarios',
      description: 'Calificación promedio de nuestros servicios'
    },
    {
      value: '50+',
      label: 'Especialidades',
      description: 'Profesionales en diversas áreas de salud mental'
    }
  ],
  testimonials: [
    {
      id: 1,
      name: 'María G.',
      role: 'Usuario de Psicomatch',
      content: 'Encontrar al terapeuta adecuado siempre fue un desafío para mí. Con Psicomatch, el proceso fue increíblemente sencillo y preciso.',
      rating: 5
    },
    {
      id: 2,
      name: 'Carlos R.',
      role: 'Usuario de Psicomatch',
      content: 'La plataforma me dio la confianza que necesitaba para empezar terapia. Mi psicólogo asignado es excelente.',
      rating: 5
    },
    {
      id: 3,
      name: 'Ana L.',
      role: 'Usuario de Psicomatch',
      content: 'Excelente servicio. El cuestionario inicial realmente ayuda a conectar con el profesional más adecuado para tus necesidades.',
      rating: 5
    }
  ],
  faqs: [
    {
      id: 1,
      question: '¿Cómo funciona Psicomatch?',
      answer: 'Psicomatch utiliza un cuestionario detallado sobre tus necesidades y preferencias para conectarte con el profesional de la salud mental más adecuado para ti. Nuestro algoritmo considera factores como especialidad, experiencia y metodología de trabajo.'
    },
    {
      id: 2,
      question: '¿Los profesionales están verificados?',
      answer: 'Sí, absolutamente todos nuestros profesionales pasan por un riguroso proceso de verificación. Revisamos sus credenciales, títulos universitarios y experiencia profesional antes de que puedan ofrecer sus servicios en nuestra plataforma.'
    },
    {
      id: 3,
      question: '¿Es confidencial la información que comparto?',
      answer: 'Por supuesto. La privacidad de tus datos es nuestra prioridad. Toda la información que proporcionas en el cuestionario y durante tus sesiones está encriptada y protegida bajo los más altos estándares de seguridad y confidencialidad.'
    },
    {
      id: 4,
      question: '¿Qué pasa si no me siento cómodo con mi profesional?',
      answer: 'Tu bienestar es lo más importante. Si sientes que no hay una buena conexión con el profesional asignado, puedes solicitar un cambio en cualquier momento. Te ayudaremos a encontrar otro especialista sin costo adicional.'
    }
  ]
};

export const homeContentService = {
  /**
   * Fetches the home content from Firestore.
   * If it doesn't exist, returns the default content.
   */
  async getHomeContent() {
    try {
      const docRef = doc(db, HOME_CONTENT_DOC);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        return defaultHomeContent;
      }
    } catch (error) {
      console.error('Error fetching home content:', error);
      return defaultHomeContent; // Fallback in case of error
    }
  },

  /**
   * Updates the home content in Firestore.
   */
  async updateHomeContent(newContent) {
    try {
      const docRef = doc(db, HOME_CONTENT_DOC);
      await setDoc(docRef, newContent, { merge: true });
      return true;
    } catch (error) {
      console.error('Error updating home content:', error);
      throw error;
    }
  }
};

export default homeContentService;
