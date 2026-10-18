/**
 * Module Avis & Réclamations — responsable : Hajer
 *
 * Porte d'entrée unique du module (routes + API publique pour les autres modules).
 * Les notes moyennes des produits sont transmises au module Produits (updateProductRating).
 */
import { complaintsAdminRouter, complaintsRouter } from './complaints.routes.js';
import { productReviewsRouter, reviewsRouter } from './reviews.routes.js';

export { getComplaintsForAnalysis } from './complaints.service.js';
export { getReviewsForAnalysis } from './reviews.service.js';

export function registerRoutes(apiRouter) {
  apiRouter.use('/products/:productId/reviews', productReviewsRouter);
  apiRouter.use('/reviews', reviewsRouter);
  apiRouter.use('/complaints', complaintsRouter);
  apiRouter.use('/admin/complaints', complaintsAdminRouter);
}
