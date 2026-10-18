import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { AccountPage } from './pages/AccountPage';
import { AdminUsersPage } from './pages/AdminUsersPage';

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
        <AdminUsersPage />
      </ProtectedRoute>
    ),
  },
];
