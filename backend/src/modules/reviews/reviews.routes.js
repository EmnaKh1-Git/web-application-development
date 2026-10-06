import { PERMISSIONS, reviewSchema } from '@smart-ecommerce/shared';
import { Router } from 'express';
import {
  authenticate,
  optionalAuthenticate,
  requirePermission,
  validate,
} from '../../core/middlewares/index.js';
import { paginationQuerySchema } from '../../core/utils/pagination.js';
import * as reviewsController from './reviews.controller.js';
import { idParamsSchema, productIdParamsSchema } from './reviews.schemas.js';

const canWrite = requirePermission(PERMISSIONS.REVIEWS_WRITE);

/* ─────────── /products/:productId/reviews ─────────── */
// mergeParams : donne accès à :productId, défini dans le chemin de montage.
export const productReviewsRouter = Router({ mergeParams: true });

/**
 * @openapi
 * /products/{productId}/reviews:
 *   get:
 *     tags: [Avis]
 *     summary: Avis d'un produit + résumé des notes (+ canReview si connecté)
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Avis paginés } }
 *   post:
 *     tags: [Avis]
 *     summary: Donner son avis (réservé aux clients qui ont reçu le produit)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { rating: { type: integer, example: 5 }, comment: { type: string } } }
 *     responses:
 *       201: { description: Avis créé }
 *       403: { description: PURCHASE_REQUIRED }
 *       409: { description: REVIEW_ALREADY_EXISTS }
 */
productReviewsRouter.get(
  '/',
  optionalAuthenticate,
  validate({ params: productIdParamsSchema, query: paginationQuerySchema }),
  reviewsController.listProductReviews,
);
productReviewsRouter.post(
  '/',
  authenticate,
  canWrite,
  validate({ params: productIdParamsSchema, body: reviewSchema }),
  reviewsController.createReview,
);

/* ─────────── /reviews ─────────── */
export const reviewsRouter = Router();
reviewsRouter.use(authenticate);

/**
 * @openapi
 * /reviews/me:
 *   get:
 *     tags: [Avis]
 *     summary: Mes avis
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Avis de l'utilisateur } }
 */
reviewsRouter.get('/me', reviewsController.listMyReviews);

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     tags: [Avis]
 *     summary: Modifier son avis
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Avis modifié }, 403: { description: NOT_RESOURCE_OWNER } }
 *   delete:
 *     tags: [Avis]
 *     summary: Supprimer un avis (auteur ou modérateur)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 204: { description: Avis supprimé } }
 */
reviewsRouter.patch(
  '/:id',
  canWrite,
  validate({ params: idParamsSchema, body: reviewSchema }),
  reviewsController.updateReview,
);
reviewsRouter.delete('/:id', validate({ params: idParamsSchema }), reviewsController.deleteReview);
