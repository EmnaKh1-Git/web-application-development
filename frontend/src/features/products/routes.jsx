import { PERMISSIONS } from '@smart-ecommerce/shared';
import { ProtectedRoute } from '@/shared/auth/ProtectedRoute';
import { CatalogPage } from './pages/CatalogPage';
import { AdminCategoriesPage } from './pages/AdminCategoriesPage';
import { AdminProductsPage } from './pages/AdminProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';

// Module Produits & Catégories — Emna

/** Routes de la boutique (MainLayout). */
export const productsRoutes = [
  {
    path: 'products/:id',
    element: <ProductDetailPage />,
  },
  {
    path: 'products',
    element: <CatalogPage />,
  },
];

/** Routes du back-office, préfixées par /admin (AdminLayout). */
export const productsAdminRoutes = [
  {
    path: 'products',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.PRODUCTS_MANAGE]}>
        <AdminProductsPage />
      </ProtectedRoute>
    ),
  },
  {
    path: 'categories',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.PRODUCTS_MANAGE]}>
        <AdminCategoriesPage />
      </ProtectedRoute>
    ),
  },
];
