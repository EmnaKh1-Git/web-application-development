import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';

// Module Panier, Commandes & Livraison — Oussama

/** Routes de la boutique (MainLayout). */
export const cartOrdersRoutes = [
  {
    path: 'cart',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.CART_MANAGE]}>
        <CartPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'orders',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.ORDERS_PLACE]}>
        <OrdersPage />
      </ProtectedRoute>
    ),
  },
];

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const ordersAdminRoutes = [
  {
    path: 'orders',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.ORDERS_MANAGE]}>
        <AdminOrdersPage />
      </ProtectedRoute>
    ),
  },
];
