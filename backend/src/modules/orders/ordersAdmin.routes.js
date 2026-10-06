import { deliverySchema, orderStatusSchema, PERMISSIONS } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as ordersController from './orders.controller.js';
import { idParamsSchema, listOrdersQuerySchema } from './orders.schemas.js';

// Gestion des commandes (back-office) : permission orders:manage.
const router = Router();
router.use(authenticate, requirePermission(PERMISSIONS.ORDERS_MANAGE));

/**
 * @openapi
 * /admin/orders:
 *   get:
 *     tags: [Administration - Commandes]
 *     summary: Toutes les commandes (filtre status, recherche n° / client)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Commandes paginées } }
 */
router.get('/', validate({ query: listOrdersQuerySchema }), ordersController.listAllOrders);

/**
 * @openapi
 * /admin/orders/stats:
 *   get:
 *     tags: [Administration - Commandes]
 *     summary: Nombre de commandes par statut et chiffre d'affaires
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Statistiques } }
 */
router.get('/stats', ordersController.getOrderStats);

/**
 * @openapi
 * /admin/orders/{id}:
 *   get:
 *     tags: [Administration - Commandes]
 *     summary: Détail d'une commande
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Commande } }
 */
router.get('/:id', validate({ params: idParamsSchema }), ordersController.getOrder);

/**
 * @openapi
 * /admin/orders/{id}/status:
 *   patch:
 *     tags: [Administration - Commandes]
 *     summary: Changer le statut — CONFIRMED diminue le stock (transaction)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { status: { type: string, enum: [PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED] } } }
 *     responses:
 *       200: { description: Statut modifié }
 *       409: { description: INVALID_STATUS_TRANSITION ou INSUFFICIENT_STOCK }
 */
router.patch(
  '/:id/status',
  validate({ params: idParamsSchema, body: orderStatusSchema }),
  ordersController.updateOrderStatus,
);

/**
 * @openapi
 * /admin/orders/{id}/delivery:
 *   patch:
 *     tags: [Administration - Commandes]
 *     summary: Transporteur, numéro de suivi, date de livraison estimée
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Livraison mise à jour } }
 */
router.patch(
  '/:id/delivery',
  validate({ params: idParamsSchema, body: deliverySchema }),
  ordersController.updateDelivery,
);

export default router;
