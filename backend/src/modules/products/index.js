/**
 * Module Produits & Catégories — responsable : Emna
 *
 * Porte d'entrée unique du module (routes + API publique pour les autres modules).
 */
import categoriesRoutes from './categories.routes.js';
import productsRoutes from './products.routes.js';

export {
  assertProductExists,
  decrementSalesCount,
  getCatalogSnapshot,
  getProductSummaries,
  incrementSalesCount,
  updateProductRating,
} from './products.service.js';
export { listCategories } from './categories.service.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/categories', categoriesRoutes);
  apiRouter.use('/products', productsRoutes);
}
