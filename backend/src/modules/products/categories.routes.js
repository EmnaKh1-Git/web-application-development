import { categorySchema, PERMISSIONS } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as productsController from './products.controller.js';
import { idParamsSchema } from './products.schemas.js';

const router = Router();
const canManage = [authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE)];

/**
 * @openapi
 * /categories:
 *   get:
 *     tags: [Catégories]
 *     summary: Liste des catégories (avec le nombre de produits actifs)
 *     responses: { 200: { description: Catégories } }
 *   post:
 *     tags: [Catégories]
 *     summary: Créer une catégorie
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Catégorie créée }, 409: { description: CATEGORY_NAME_TAKEN } }
 */
router.get('/', productsController.listCategories);
router.post(
  '/',
  ...canManage,
  validate({ body: categorySchema }),
  productsController.createCategory,
);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     tags: [Catégories]
 *     summary: Détail d'une catégorie
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Catégorie } }
 *   put:
 *     tags: [Catégories]
 *     summary: Modifier une catégorie
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Catégorie modifiée } }
 *   delete:
 *     tags: [Catégories]
 *     summary: Supprimer une catégorie vide
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 204: { description: Supprimée }, 409: { description: CATEGORY_NOT_EMPTY } }
 */
router.get('/:id', validate({ params: idParamsSchema }), productsController.getCategory);
router.put(
  '/:id',
  ...canManage,
  validate({ params: idParamsSchema, body: categorySchema }),
  productsController.updateCategory,
);
router.delete(
  '/:id',
  ...canManage,
  validate({ params: idParamsSchema }),
  productsController.deleteCategory,
);

export default router;
