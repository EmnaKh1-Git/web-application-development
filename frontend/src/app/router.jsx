import { BACK_OFFICE_ROLES } from '@smart-ecommerce/shared';
import { createBrowserRouter } from 'react-router';
import { aiAdminRoutes } from '@/features/ai/routes';
import { authRoutes } from '@/features/auth/routes';
import { cartOrdersRoutes, ordersAdminRoutes } from '@/features/cart-orders/routes';
import { productsAdminRoutes, productsRoutes } from '@/features/products/routes';
import {
  complaintsAdminRoutes,
  reviewsComplaintsRoutes,
} from '@/features/reviews-complaints/routes';
import { stockAdminRoutes } from '@/features/stock/routes';
import { usersAdminRoutes, usersRoutes } from '@/features/users/routes';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { AdminLayout } from '@/shared/layouts/AdminLayout';
import { MainLayout } from '@/shared/layouts/MainLayout';
import { AdminDashboardPage } from '@/shared/pages/AdminDashboardPage';
import { HomePage } from '@/shared/pages/HomePage';
import { NotFoundPage } from '@/shared/pages/NotFoundPage';
import { RouteErrorPage } from '@/shared/pages/RouteErrorPage';

/**
 * Routes de l'application.
 * Chaque module déclare ses routes dans features/<module>/routes.jsx :
 * ce fichier n'a pas besoin d'être modifié pour ajouter une page à un module existant.
 */
export const routes = [
  {
    // Boutique
    element: <MainLayout />,
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      ...authRoutes,
      ...usersRoutes,
      ...productsRoutes,
      ...cartOrdersRoutes,
      ...reviewsComplaintsRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    // Back-office : ADMIN et STOCK_MANAGER (chaque page vérifie ensuite sa permission)
    path: '/admin',
    element: (
      <ProtectedRoute roles={BACK_OFFICE_ROLES}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      { index: true, element: <AdminDashboardPage /> },
      ...usersAdminRoutes,
      ...productsAdminRoutes,
      ...ordersAdminRoutes,
      ...complaintsAdminRoutes,
      ...stockAdminRoutes,
      ...aiAdminRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
