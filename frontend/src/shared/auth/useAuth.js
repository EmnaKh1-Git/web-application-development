import { useContext } from 'react';
import { AuthContext } from './AuthContext';

/**
 * Accès à la session dans n'importe quel composant :
 * const { user, isAuthenticated, hasPermission, login, logout } = useAuth();
 */
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth() doit être utilisé à l’intérieur de <AuthProvider>');
  }
  return auth;
}
