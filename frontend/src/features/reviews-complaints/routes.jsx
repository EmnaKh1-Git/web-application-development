import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';

// Module Avis & Réclamations — Hajer
// Les avis seront affichés sur la page détail d'un produit (composants exportés par ce module).

/** Routes de la boutique (MainLayout). */
export const reviewsComplaintsRoutes = [
  {
    path: 'complaints',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.COMPLAINTS_CREATE]}>
        <ComplaintsPage />
      </ProtectedRoute>
    ),
  },
];

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const complaintsAdminRoutes = [
  {
    path: 'complaints',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.COMPLAINTS_MANAGE]}>
        <AdminComplaintsPage />
      </ProtectedRoute>
    ),
  },
];
