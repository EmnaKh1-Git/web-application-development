import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { AdminComplaintsPage } from './pages/AdminComplaintsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';

// Module Avis & Réclamations — Hajer
// Les avis sont affichés sur la page détail d'un produit (components/ProductReviews.jsx)
// et dans « Mon compte » (onglet Mes avis).

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
