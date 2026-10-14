/**
 * Module Stock — responsable : Yassine
 *
 * Porte d'entrée unique du module (routes + API publique pour les autres modules).
 * Permissions : stock:read et stock:manage (rôles ADMIN et STOCK_MANAGER).
 */
import { EVENTS, subscribe } from '../../core/events/index.js';
import { logger } from '../../core/utils/logger.js';
import stockRoutes from './stock.routes.js';

export {
  createStockForProduct,
  decreaseStockForOrder,
  getStockLevels,
  getStocksByProductIds,
  restoreStockForOrder,
} from './stock.service.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/stock', stockRoutes);
}

// Alerte de stock faible : journalisée (pourra déclencher un email ou une notification plus tard).
subscribe(EVENTS.STOCK_LOW, ({ productId, quantity, threshold }) => {
  logger.warn(`Stock faible pour le produit n°${productId} : ${quantity} (seuil ${threshold})`);
});
