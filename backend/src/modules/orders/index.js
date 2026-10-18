/**
 * Module Panier, Commandes & Livraison — responsable : Oussama
 *
 * Porte d'entrée unique du module (routes + API publique pour les autres modules).
 *
 * Règle métier validée : le stock est diminué à la CONFIRMATION de la commande
 * (appel direct à stock.decreaseStockForOrder dans une transaction), pas à sa création.
 */
import cartRoutes from './cart.routes.js';
import ordersRoutes from './orders.routes.js';
import ordersAdminRoutes from './ordersAdmin.routes.js';

export {
  findUserOrder,
  getOrderHistory,
  hasUserPurchasedProduct,
  listMyOrders,
} from './orders.service.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/cart', cartRoutes);
  apiRouter.use('/orders', ordersRoutes);
  apiRouter.use('/admin/orders', ordersAdminRoutes);
}
