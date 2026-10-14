import {
  assistantSchema,
  PERMISSIONS,
  productCategorizeSchema,
  productDescriptionRequestSchema,
  receptionSchema,
} from '@smart-ecommerce/shared';
import { Router } from 'express';
import {
  aiRateLimiter,
  authenticate,
  optionalAuthenticate,
  requirePermission,
  validate,
} from '../../core/middlewares/index.js';
import * as aiController from './ai.controller.js';
import {
  idParamsSchema,
  orderRiskQuerySchema,
  productForecastQuerySchema,
  productIdParamsSchema,
  recommendationsQuerySchema,
} from './ai.schemas.js';

const router = Router();
const can = (permission) => [authenticate, requirePermission(permission)];

/* ─────────── Boutique (public) ─────────── */

/**
 * @openapi
 * /ai/status:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Fournisseur d'IA actif (Claude ou IA locale)
 *     responses: { 200: { description: État du module IA } }
 */
router.get('/status', aiController.status);

/**
 * @openapi
 * /ai/recommendations:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Recommandations (produit, panier, personnalisées ou populaires), tenant compte du stock
 *     parameters:
 *       - { in: query, name: productId, schema: { type: integer } }
 *       - { in: query, name: productIds, schema: { type: string, example: '1,5,9' } }
 *       - { in: query, name: limit, schema: { type: integer, default: 4 } }
 *     responses: { 200: { description: 'Produits recommandés, chacun avec sa raison' } }
 */
router.get(
  '/recommendations',
  optionalAuthenticate,
  validate({ query: recommendationsQuerySchema }),
  aiController.recommendations,
);

/**
 * @openapi
 * /ai/products/{productId}/reviews-summary:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Résumé des avis d'un produit (points forts et points faibles)
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: 'Résumé (available = false s’il y a moins de 2 avis)' } }
 */
router.get(
  '/products/:productId/reviews-summary',
  validate({ params: productIdParamsSchema }),
  aiController.reviewsSummary,
);

/**
 * @openapi
 * /ai/assistant:
 *   post:
 *     tags: [Intelligence artificielle]
 *     summary: Assistant d'achat conversationnel
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messages:
 *                 type: array
 *                 example: [{ role: user, content: 'Un cadeau pour ma sœur à moins de 100 DT' }]
 *     responses: { 200: { description: 'Réponse, produits proposés et suggestions' } }
 */
router.post(
  '/assistant',
  aiRateLimiter,
  optionalAuthenticate,
  validate({ body: assistantSchema }),
  aiController.assistant,
);

/* ─────────── Stock (module de Yassine) ─────────── */

/**
 * @openapi
 * /ai/stock/forecast:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Prévision des ruptures et quantités de réapprovisionnement conseillées
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Prévisions par produit (les plus urgentes en premier) } }
 */
router.get('/stock/forecast', ...can(PERMISSIONS.STOCK_READ), aiController.stockForecast);

/**
 * @openapi
 * /ai/stock/forecast/{productId}:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Historique, prévision jour par jour et projection du stock d'un produit
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: productId, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Prévision détaillée } }
 */
router.get(
  '/stock/forecast/:productId',
  ...can(PERMISSIONS.STOCK_READ),
  validate({ params: productIdParamsSchema, query: productForecastQuerySchema }),
  aiController.productForecast,
);

/**
 * @openapi
 * /ai/stock/reception:
 *   post:
 *     tags: [Intelligence artificielle]
 *     summary: Lecture d'un bon de livraison (texte, ou photo avec Claude) et rapprochement avec le catalogue
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: 'Lignes reconnues à valider (rien n’est enregistré)' } }
 */
router.post(
  '/stock/reception',
  aiRateLimiter,
  ...can(PERMISSIONS.STOCK_MANAGE),
  validate({ body: receptionSchema }),
  aiController.reception,
);

/* ─────────── Back-office ─────────── */

/**
 * @openapi
 * /ai/complaints/insights:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Catégorie et priorité de chaque réclamation
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Analyse par réclamation } }
 * /ai/complaints/{id}/reply:
 *   post:
 *     tags: [Intelligence artificielle]
 *     summary: Brouillon de réponse au client
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Réponse proposée } }
 */
router.get(
  '/complaints/insights',
  ...can(PERMISSIONS.COMPLAINTS_MANAGE),
  aiController.complaintInsights,
);
router.post(
  '/complaints/:id/reply',
  aiRateLimiter,
  ...can(PERMISSIONS.COMPLAINTS_MANAGE),
  validate({ params: idParamsSchema }),
  aiController.complaintReply,
);

/**
 * @openapi
 * /ai/products/describe:
 *   post:
 *     tags: [Intelligence artificielle]
 *     summary: Rédaction d'une description de produit
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Description proposée } }
 * /ai/products/categorize:
 *   post:
 *     tags: [Intelligence artificielle]
 *     summary: Catégorie suggérée pour un produit (classifieur bayésien)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Catégories les plus probables } }
 */
router.post(
  '/products/describe',
  aiRateLimiter,
  ...can(PERMISSIONS.PRODUCTS_MANAGE),
  validate({ body: productDescriptionRequestSchema }),
  aiController.productDescription,
);
router.post(
  '/products/categorize',
  ...can(PERMISSIONS.PRODUCTS_MANAGE),
  validate({ body: productCategorizeSchema }),
  aiController.productCategory,
);

/**
 * @openapi
 * /ai/orders/risk:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Score de risque des commandes (par défaut, celles à traiter)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: query, name: ids, schema: { type: string, example: '12,15' } }]
 *     responses: { 200: { description: Score, niveau et raisons par commande } }
 * /ai/customers/segments:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Segmentation RFM des clients
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Segment de chaque client et répartition } }
 */
router.get(
  '/orders/risk',
  ...can(PERMISSIONS.ORDERS_MANAGE),
  validate({ query: orderRiskQuerySchema }),
  aiController.orderRisk,
);
router.get('/customers/segments', ...can(PERMISSIONS.USERS_MANAGE), aiController.customerSegments);

/**
 * @openapi
 * /ai/briefing:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Points clés du jour (selon les permissions de l'utilisateur)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Constats et synthèse } }
 * /ai/evaluation:
 *   get:
 *     tags: [Intelligence artificielle]
 *     summary: Mesures de qualité des modèles (backtest, taux de réussite, précision)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Indicateurs d'évaluation } }
 */
router.get('/briefing', ...can(PERMISSIONS.AI_INSIGHTS), aiController.briefing);
router.get('/evaluation', ...can(PERMISSIONS.AI_INSIGHTS), aiController.evaluation);

export default router;
