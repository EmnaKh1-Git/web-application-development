import { addCartItemSchema, PERMISSIONS, updateCartItemSchema } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as ordersController from './orders.controller.js';
import { itemIdParamsSchema } from './orders.schemas.js';

const router = Router();
router.use(authenticate, requirePermission(PERMISSIONS.CART_MANAGE));

/**
 * @openapi
 * /cart:
 *   get:
 *     tags: [Panier]
 *     summary: Mon panier (prix et total calculés par le serveur)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Panier } }
 *   delete:
 *     tags: [Panier]
 *     summary: Vider le panier
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Panier vide } }
 */
router.get('/', ordersController.getCart);
router.delete('/', ordersController.clearCart);

/**
 * @openapi
 * /cart/items:
 *   post:
 *     tags: [Panier]
 *     summary: Ajouter un produit au panier
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { productId: { type: integer }, quantity: { type: integer, example: 1 } } }
 *     responses: { 200: { description: Panier mis à jour }, 409: { description: INSUFFICIENT_STOCK } }
 */
router.post('/items', validate({ body: addCartItemSchema }), ordersController.addCartItem);

/**
 * @openapi
 * /cart/items/{itemId}:
 *   patch:
 *     tags: [Panier]
 *     summary: Modifier la quantité d'un article
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: itemId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Panier mis à jour } }
 *   delete:
 *     tags: [Panier]
 *     summary: Retirer un article
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: itemId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Panier mis à jour } }
 */
router.patch(
  '/items/:itemId',
  validate({ params: itemIdParamsSchema, body: updateCartItemSchema }),
  ordersController.updateCartItem,
);
router.delete(
  '/items/:itemId',
  validate({ params: itemIdParamsSchema }),
  ordersController.removeCartItem,
);

export default router;
