import { Navigate, Outlet, useLocation } from 'react-router';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { ForbiddenPage } from '@/shared/pages/ForbiddenPage';
import { useAuth } from './useAuth';

/**
 * Protège une page :
 * - utilisateur non connecté      → redirection vers /login (retour automatique après connexion) ;
 * - rôle ou permission manquants  → page « Accès refusé ».
 *
 * Cette protection améliore l'expérience utilisateur ; la VRAIE sécurité est
 * assurée par le Back-End (authenticate + requirePermission sur chaque route).
 *
 * @example
 * <ProtectedRoute permissions={[PERMISSIONS.STOCK_READ]}><StockPage /></ProtectedRoute>
 *
 * @param {{ roles?: string[], permissions?: string[], children?: React.ReactNode }} props
 *   roles : l'un des rôles est requis ; permissions : toutes sont requises.
 */
export function ProtectedRoute({ roles, permissions, children }) {
  const { status, user, hasPermission } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageSpinner />;
  }
  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const roleAllowed = !roles || roles.includes(user.role);
  const permissionsAllowed =
    !permissions || permissions.every((permission) => hasPermission(permission));
  if (!roleAllowed || !permissionsAllowed) {
    return <ForbiddenPage />;
  }

  return children ?? <Outlet />;
}
