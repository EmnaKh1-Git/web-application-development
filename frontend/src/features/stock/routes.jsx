import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { StockPage } from './pages/StockPage';

// Module Stock — Yassine (rôles ADMIN et STOCK_MANAGER)

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const stockAdminRoutes = [
  {
    path: 'stock',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.STOCK_READ]}>
        <StockPage />
      </ProtectedRoute>
    ),
  },
];
