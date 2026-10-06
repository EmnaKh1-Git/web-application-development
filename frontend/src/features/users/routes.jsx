import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { ComingSoonPage } from '@/shared/pages/ComingSoonPage';
import { AccountPage } from './pages/AccountPage';

// Module Utilisateurs — Fares

/** Routes de la boutique (MainLayout). */
export const usersRoutes = [
  {
    path: 'account',
    element: (
      <ProtectedRoute>
        <AccountPage />
      </ProtectedRoute>
    ),
  },
];

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const usersAdminRoutes = [
  {
    path: 'users',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.USERS_MANAGE]}>
        <ComingSoonPage
          title="Gestion des utilisateurs"
          owner="Fares"
          features={[
            'Liste et recherche des utilisateurs',
            'Blocage et déblocage des comptes',
            'Gestion des rôles',
          ]}
        />
      </ProtectedRoute>
    ),
  },
];
