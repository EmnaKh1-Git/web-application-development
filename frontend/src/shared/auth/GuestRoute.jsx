import { Navigate, useLocation } from 'react-router';
import { PageSpinner } from '@/shared/components/ui/Spinner';
import { useAuth } from './useAuth';

/**
 * Pages réservées aux visiteurs non connectés (connexion, inscription).
 * Dès que l'utilisateur est connecté, il est redirigé :
 * - vers la page qu'il voulait ouvrir avant la connexion, s'il y en a une ;
 * - sinon vers le back-office (ADMIN, STOCK_MANAGER) ou l'accueil (CLIENT).
 */
export function GuestRoute({ children }) {
  const { status, isBackOfficeUser } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return <PageSpinner />;
  }
  if (status === 'authenticated') {
    const defaultPath = isBackOfficeUser ? '/admin' : '/';
    return <Navigate to={location.state?.from?.pathname ?? defaultPath} replace />;
  }
  return children;
}
