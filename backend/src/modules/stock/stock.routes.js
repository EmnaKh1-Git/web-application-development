import { addStockSchema, adjustStockSchema, PERMISSIONS } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import * as stockController from './stock.controller.js';
import {
  listMovementsQuerySchema,
  listStockQuerySchema,
  productIdParamsSchema,
} from './stock.schemas.js';

const router = Router();

// Toutes les routes du stock sont réservées au back-office (ADMIN, STOCK_MANAGER).
router.use(authenticate);
const canRead = requirePermission(PERMISSIONS.STOCK_READ);
const canManage = requirePermission(PERMISSIONS.STOCK_MANAGE);

/**
 * @openapi
 * /stock:
 *   get:
 *     tags: [Stock]
 *     summary: Liste du stock (filtres status=all|ok|low|out|alert, search, categoryId, sort)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Stock paginé } }
 */
router.get('/', canRead, validate({ query: listStockQuerySchema }), stockController.list);

/**
 * @openapi
 * /stock/alerts:
 *   get:
 *     tags: [Stock]
 *     summary: Produits en stock faible ou en rupture
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Alertes de stock } }
 */
router.get('/alerts', canRead, stockController.alerts);

/**
 * @openapi
 * /stock/summary:
 *   get:
 *     tags: [Stock]
 *     summary: Chiffres clés (produits, unités, ruptures, stocks faibles)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Résumé du stock } }
 */
router.get('/summary', canRead, stockController.summary);

/**
 * @openapi
 * /stock/movements:
 *   get:
 *     tags: [Stock]
 *     summary: Historique de tous les mouvements de stock
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Mouvements paginés } }
 */
router.get(
  '/movements',
  canRead,
  validate({ query: listMovementsQuerySchema }),
  stockController.movements,
);

/**
 * @openapi
 * /stock/{productId}:
 *   get:
 *     tags: [Stock]
 *     summary: Stock d'un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Stock du produit }, 404: { description: STOCK_NOT_FOUND } }
 *   patch:
 *     tags: [Stock]
 *     summary: Corriger la quantité (inventaire) et/ou le seuil d'alerte
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quantity: { type: integer, example: 25 }
 *               lowStockThreshold: { type: integer, example: 5 }
 *               reason: { type: string, example: Inventaire mensuel }
 *     responses: { 200: { description: Stock mis à jour } }
 */
router.get(
  '/:productId',
  canRead,
  validate({ params: productIdParamsSchema }),
  stockController.detail,
);
router.patch(
  '/:productId',
  canManage,
  validate({ params: productIdParamsSchema, body: adjustStockSchema }),
  stockController.adjust,
);

/**
 * @openapi
 * /stock/{productId}/movements:
 *   get:
 *     tags: [Stock]
 *     summary: Historique des mouvements d'un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Mouvements paginés } }
 */
router.get(
  '/:productId/movements',
  canRead,
  validate({ params: productIdParamsSchema, query: paginationQuerySchema }),
  stockController.productMovements,
);

/**
 * @openapi
 * /stock/{productId}/add:
 *   post:
 *     tags: [Stock]
 *     summary: Ajouter du stock (réapprovisionnement)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, example: 10 }
 *               reason: { type: string, example: Livraison fournisseur }
 *     responses: { 200: { description: Stock mis à jour } }
 */
router.post(
  '/:productId/add',
  canManage,
  validate({ params: productIdParamsSchema, body: addStockSchema }),
  stockController.add,
);

export default router;
