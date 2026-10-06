import { PERMISSIONS, productCreateSchema, productSchema } from '@smart-ecommerce/shared';
import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  validate,
} from '../../core/middlewares/index.js';
import * as productsController from './products.controller.js';
import { idParamsSchema, listProductsQuerySchema } from './products.schemas.js';

const router = Router();
const canManage = [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)];

/**
 * @openapi
 * /products:
 *   get:
 *     tags: [Produits]
 *     summary: Catalogue (recherche, filtres, tri, pagination)
 *     parameters:
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: categoryId, schema: { type: integer } }
 *       - { in: query, name: minPrice, schema: { type: number } }
 *       - { in: query, name: maxPrice, schema: { type: number } }
 *       - { in: query, name: inStock, schema: { type: boolean } }
 *       - { in: query, name: sort, schema: { type: string, enum: [newest, price_asc, price_desc, popularity, rating] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: Produits paginés } }
 *   post:
 *     tags: [Produits]
 *     summary: Créer un produit (avec son stock initial)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Produit créé }, 400: { $ref: '#/components/responses/ValidationError' } }
 */
router.get(
  '/',
  optionalAuthenticate,
  validate({ query: listProductsQuerySchema }),
  productsController.listProducts,
);
router.post(
  '/',
  ...canManage,
  validate({ body: productCreateSchema }),
  productsController.createProduct,
);

/**
 * @openapi
 * /products/{id}:
 *   get:
 *     tags: [Produits]
 *     summary: Fiche d'un produit
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Produit }, 404: { description: PRODUCT_NOT_FOUND } }
 *   put:
 *     tags: [Produits]
 *     summary: Modifier un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Produit modifié } }
 *   delete:
 *     tags: [Produits]
 *     summary: Désactiver un produit (il reste dans l'historique des commandes)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 204: { description: Produit désactivé } }
 */
router.get(
  '/:id',
  optionalAuthenticate,
  validate({ params: idParamsSchema }),
  productsController.getProduct,
);
router.put(
  '/:id',
  ...canManage,
  validate({ params: idParamsSchema, body: productSchema }),
  productsController.updateProduct,
);
router.delete(
  '/:id',
  ...canManage,
  validate({ params: idParamsSchema }),
  productsController.deactivateProduct,
);

export default router;
