/**
 * Utilidad de logging condicional
 * Solo registra mensajes en modo desarrollo para mantener la consola limpia en producción
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Logger personalizado que solo funciona en desarrollo
 */
export const logger = {
  /**
   * Log estándar
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log de error
   */
  error: (...args) => {
    if (isDevelopment) {
      console.error(...args);
    }
  },

  /**
   * Log de advertencia
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log de información
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Log de debug
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log con tabla
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Agrupa logs
   */
  group: (label) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * Cierra grupo de logs
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  }
};

export default logger;
