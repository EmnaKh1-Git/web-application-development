import { createContext } from 'react';
import { BACK_OFFICE_ROLES, hasPermission as roleHasPermission } from '@smart-ecommerce/shared';

export const AuthContext = createContext(null);

/**
 * Construit la valeur exposée par useAuth().
 * Fonction pure, réutilisée par AuthProvider et par les tests.
 *
 * status : 'loading' (vérification du jeton au démarrage) | 'authenticated' | 'anonymous'
 */
export function createAuthValue({
  user = null,
  status = 'anonymous',
  login,
  register,
  logout,
  updateUser,
}) {
  return {
    user,
    status,
    isAuthenticated: status === 'authenticated' && user !== null,
    login,
    register,
    logout,
    updateUser,
    hasRole: (...roles) => Boolean(user && roles.includes(user.role)),
    hasPermission: (permission) => Boolean(user && roleHasPermission(user.role, permission)),
    isBackOfficeUser: Boolean(user && BACK_OFFICE_ROLES.includes(user.role)),
  };
}
