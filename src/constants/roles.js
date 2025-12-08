/**
 * Constantes de roles de usuario
 * Define los diferentes tipos de usuarios en la plataforma PsicoMatch
 */

export const ROLES = {
  USER: 'user',
  PROFESSIONAL: 'professional',
  ADMIN: 'admin'
};

export const ROLE_LABELS = {
  [ROLES.USER]: 'Usuario',
  [ROLES.PROFESSIONAL]: 'Profesional',
  [ROLES.ADMIN]: 'Administrador'
};

/**
 * Verifica si un rol es válido
 * @param {string} role - Rol a verificar
 * @returns {boolean}
 */
export const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};
