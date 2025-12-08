import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';

/**
 * Tour de onboarding para usuarios nuevos
 */
export const userOnboardingTour = () => {
  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    steps: [
      {
        element: '#dashboard-welcome',
        popover: {
          title: '¡Bienvenido a PsicoMatch! 👋',
          description: 'Te voy a mostrar cómo usar la plataforma para encontrar el profesional perfecto para ti.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#user-profile-section',
        popover: {
          title: 'Tu Perfil',
          description: 'Aquí puedes ver y editar tu información personal. Es importante mantenerla actualizada.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#evaluation-test-card',
        popover: {
          title: 'Evaluación Inicial',
          description: 'Completa esta evaluación para que podamos recomendarte los profesionales más adecuados para ti. Solo toma 5 minutos.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#recommended-professionals',
        popover: {
          title: 'Profesionales Recomendados',
          description: 'Basándonos en tu perfil y evaluación, aquí encontrarás profesionales con alta compatibilidad contigo. Verás un porcentaje de match.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '#search-filters',
        popover: {
          title: 'Filtros de Búsqueda',
          description: 'Usa estos filtros para refinar tu búsqueda: especialidad, precio, modalidad (online/presencial), disponibilidad.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#professional-card-first',
        popover: {
          title: 'Tarjeta de Profesional',
          description: 'Cada tarjeta muestra: nombre, especialidad, años de experiencia, rating y precio por sesión. Click en "Ver Perfil" para más detalles.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#sessions-menu',
        popover: {
          title: 'Mis Sesiones',
          description: 'Aquí puedes ver tus sesiones programadas, completadas e historial. También recibirás recordatorios por email.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#chat-icon',
        popover: {
          title: 'Chat en Tiempo Real',
          description: 'Una vez que reserves una sesión, podrás chatear con tu profesional directamente desde aquí.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#notifications-bell',
        popover: {
          title: 'Notificaciones',
          description: 'Aquí recibirás notificaciones sobre matches, sesiones, mensajes y más.',
          side: 'bottom',
          align: 'end'
        }
      },
      {
        element: '#theme-toggle',
        popover: {
          title: 'Modo Oscuro',
          description: 'Cambia entre modo claro y oscuro según tu preferencia. ¡Pruébalo!',
          side: 'bottom',
          align: 'end'
        }
      },
      {
        popover: {
          title: '¡Listo para Comenzar! 🎉',
          description: 'Ya conoces lo básico. Te recomendamos completar la evaluación inicial para recibir las mejores recomendaciones. ¡Buena suerte en tu camino hacia el bienestar!',
        }
      }
    ],
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Entendido!',
    progressText: 'Paso {{current}} de {{total}}',
    onDestroyed: () => {
      // Guardar que el usuario completó el tour
      localStorage.setItem('userOnboardingCompleted', 'true');
    }
  });

  driverObj.drive();
};

/**
 * Tour de onboarding para profesionales
 */
export const professionalOnboardingTour = () => {
  const driverObj = driver({
    showProgress: true,
    showButtons: ['next', 'previous', 'close'],
    steps: [
      {
        element: '#professional-dashboard-welcome',
        popover: {
          title: '¡Bienvenido, Profesional! 👨‍⚕️',
          description: 'Te mostraremos cómo gestionar tu práctica en PsicoMatch.',
          side: 'bottom',
          align: 'start'
        }
      },
      {
        element: '#professional-stats',
        popover: {
          title: 'Tus Estadísticas',
          description: 'Aquí ves un resumen de tus pacientes activos, sesiones completadas, rating promedio e ingresos del mes.',
          side: 'bottom',
          align: 'center'
        }
      },
      {
        element: '#professional-profile-section',
        popover: {
          title: 'Tu Perfil Profesional',
          description: 'Es crucial mantener tu perfil actualizado: especialidades, experiencia, precios, disponibilidad. Esto afecta tu visibilidad en búsquedas.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#availability-toggle',
        popover: {
          title: 'Disponibilidad',
          description: 'Controla si estás aceptando nuevos pacientes. Desactívalo temporalmente si necesitas un descanso.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#pending-appointments',
        popover: {
          title: 'Citas Pendientes',
          description: 'Aquí verás las solicitudes de sesión nuevas. Puedes aceptar o rechazar cada una con un mensaje al paciente.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '#calendar-view',
        popover: {
          title: 'Calendario de Sesiones',
          description: 'Vista de todas tus sesiones programadas. Usa los colores para identificar: pendiente, confirmada, completada.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#patient-list',
        popover: {
          title: 'Mis Pacientes',
          description: 'Lista de todos tus pacientes activos. Click en uno para ver historial de sesiones y notas.',
          side: 'right',
          align: 'start'
        }
      },
      {
        element: '#reviews-section',
        popover: {
          title: 'Reseñas y Calificaciones',
          description: 'Las reseñas de tus pacientes son visibles públicamente. Mantén un buen rating para atraer más pacientes.',
          side: 'top',
          align: 'start'
        }
      },
      {
        element: '#professional-chat',
        popover: {
          title: 'Chat con Pacientes',
          description: 'Comunícate con tus pacientes antes y después de las sesiones. Mantén la comunicación profesional.',
          side: 'left',
          align: 'center'
        }
      },
      {
        element: '#earnings-report',
        popover: {
          title: 'Reportes de Ingresos',
          description: 'Descarga reportes mensuales de tus ingresos para tu contabilidad.',
          side: 'bottom',
          align: 'end'
        }
      },
      {
        popover: {
          title: '¡Todo Listo! 🚀',
          description: 'Ya conoces las funciones principales. Recuerda: mantén tu perfil actualizado y responde rápido a las solicitudes para mejorar tu rating. ¡Éxito!',
        }
      }
    ],
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Entendido!',
    progressText: 'Paso {{current}} de {{total}}',
    onDestroyed: () => {
      localStorage.setItem('professionalOnboardingCompleted', 'true');
    }
  });

  driverObj.drive();
};

/**
 * Tour rápido de una funcionalidad específica
 */
export const featureTour = (featureName) => {
  const tours = {
    chat: () => {
      const chatTour = driver({
        showProgress: false,
        steps: [
          {
            element: '#chat-window',
            popover: {
              title: 'Chat en Tiempo Real 💬',
              description: 'Envía mensajes instantáneos. Los mensajes se sincronizan en tiempo real.',
              side: 'left'
            }
          },
          {
            element: '#chat-input',
            popover: {
              title: 'Escribe tu Mensaje',
              description: 'Escribe aquí y presiona Enter o click en el botón de enviar.',
              side: 'top'
            }
          }
        ],
        doneBtnText: 'Ok',
      });
      chatTour.drive();
    },
    
    reviews: () => {
      const reviewTour = driver({
        showProgress: false,
        steps: [
          {
            element: '#review-stars',
            popover: {
              title: 'Califica al Profesional ⭐',
              description: 'Click en las estrellas para dar tu calificación del 1 al 5.',
              side: 'bottom'
            }
          },
          {
            element: '#review-comment',
            popover: {
              title: 'Comparte tu Experiencia',
              description: 'Escribe un comentario detallado (mínimo 10 caracteres). Ayuda a otros usuarios a elegir.',
              side: 'top'
            }
          }
        ],
        doneBtnText: 'Entendido',
      });
      reviewTour.drive();
    }
  };

  if (tours[featureName]) {
    tours[featureName]();
  }
};

/**
 * Verificar si el usuario ya completó el onboarding
 */
export const shouldShowOnboarding = (userType = 'user') => {
  const key = userType === 'professional' ? 
    'professionalOnboardingCompleted' : 
    'userOnboardingCompleted';
  
  return !localStorage.getItem(key);
};

/**
 * Resetear onboarding (para testing o si el usuario quiere verlo de nuevo)
 */
export const resetOnboarding = (userType = 'user') => {
  const key = userType === 'professional' ? 
    'professionalOnboardingCompleted' : 
    'userOnboardingCompleted';
  
  localStorage.removeItem(key);
};
