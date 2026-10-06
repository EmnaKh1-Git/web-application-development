import { checkoutSchema, PERMISSIONS } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as ordersController from './orders.controller.js';
import { idParamsSchema, listMyOrdersQuerySchema } from './orders.schemas.js';

const router = Router();
router.use(authenticate);
const canPlaceOrders = requirePermission(PERMISSIONS.ORDERS_PLACE);

/**
 * @openapi
 * /orders:
 *   post:
 *     tags: [Commandes]
 *     summary: Passer commande à partir du panier (statut En attente, stock non encore diminué)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { addressId: { type: integer }, notes: { type: string } } }
 *     responses: { 201: { description: Commande créée }, 400: { description: EMPTY_CART }, 409: { description: CART_UNAVAILABLE_ITEMS } }
 *   get:
 *     tags: [Commandes]
 *     summary: Mes commandes (filtre status)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Commandes paginées } }
 */
router.post('/', canPlaceOrders, validate({ body: checkoutSchema }), ordersController.createOrder);
router.get(
  '/',
  canPlaceOrders,
  validate({ query: listMyOrdersQuerySchema }),
  ordersController.listMyOrders,
);

/**
 * @openapi
 * /orders/{id}:
 *   get:
 *     tags: [Commandes]
 *     summary: Détail d'une commande (propriétaire ou administrateur)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Commande }, 403: { description: NOT_RESOURCE_OWNER } }
 */
router.get('/:id', validate({ params: idParamsSchema }), ordersController.getOrder);

/**
 * @openapi
 * /orders/{id}/delivery:
 *   get:
 *     tags: [Commandes]
 *     summary: Suivi de livraison
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Livraison } }
 */
router.get('/:id/delivery', validate({ params: idParamsSchema }), ordersController.getDelivery);

/**
 * @openapi
 * /orders/{id}/cancel:
 *   patch:
 *     tags: [Commandes]
 *     summary: Annuler sa commande (avant expédition ; stock restauré si elle était confirmée)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Commande annulée }, 409: { description: ORDER_NOT_CANCELLABLE } }
 */
router.patch('/:id/cancel', validate({ params: idParamsSchema }), ordersController.cancelOrder);

export default router;
