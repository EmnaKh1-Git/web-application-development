import { complaintHandlingSchema, complaintSchema, PERMISSIONS } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as reviewsController from './reviews.controller.js';
import { idParamsSchema, listComplaintsQuerySchema } from './reviews.schemas.js';

/* ─────────── /complaints (client) ─────────── */
export const complaintsRouter = Router();
complaintsRouter.use(authenticate);
const canCreate = requirePermission(PERMISSIONS.COMPLAINTS_CREATE);

/**
 * @openapi
 * /complaints:
 *   post:
 *     tags: [Réclamations]
 *     summary: Déposer une réclamation (éventuellement liée à une commande)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { subject: { type: string }, description: { type: string }, orderId: { type: integer } } }
 *     responses: { 201: { description: Réclamation créée } }
 *   get:
 *     tags: [Réclamations]
 *     summary: Mes réclamations
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Réclamations paginées } }
 */
complaintsRouter.post(
  '/',
  canCreate,
  validate({ body: complaintSchema }),
  reviewsController.createComplaint,
);
complaintsRouter.get(
  '/',
  canCreate,
  validate({ query: listComplaintsQuerySchema }),
  reviewsController.listMyComplaints,
);

/**
 * @openapi
 * /complaints/{id}:
 *   get:
 *     tags: [Réclamations]
 *     summary: Détail d'une réclamation (auteur ou gestionnaire)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Réclamation } }
 */
complaintsRouter.get('/:id', validate({ params: idParamsSchema }), reviewsController.getComplaint);

/* ─────────── /admin/complaints (complaints:manage) ─────────── */
export const complaintsAdminRouter = Router();
complaintsAdminRouter.use(authenticate, requirePermission(PERMISSIONS.COMPLAINTS_MANAGE));

/**
 * @openapi
 * /admin/complaints:
 *   get:
 *     tags: [Administration - Réclamations]
 *     summary: Toutes les réclamations (filtre status, recherche)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Réclamations paginées } }
 */
complaintsAdminRouter.get(
  '/',
  validate({ query: listComplaintsQuerySchema }),
  reviewsController.listAllComplaints,
);

/**
 * @openapi
 * /admin/complaints/stats:
 *   get:
 *     tags: [Administration - Réclamations]
 *     summary: Nombre de réclamations par statut
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Statistiques } }
 */
complaintsAdminRouter.get('/stats', reviewsController.getComplaintStats);

/**
 * @openapi
 * /admin/complaints/{id}:
 *   get:
 *     tags: [Administration - Réclamations]
 *     summary: Détail d'une réclamation
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Réclamation } }
 *   patch:
 *     tags: [Administration - Réclamations]
 *     summary: Traiter une réclamation (statut + réponse au client)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema: { type: object, properties: { status: { type: string, enum: [OPEN, IN_PROGRESS, RESOLVED, REJECTED] }, adminResponse: { type: string } } }
 *     responses: { 200: { description: Réclamation traitée } }
 */
complaintsAdminRouter.get(
  '/:id',
  validate({ params: idParamsSchema }),
  reviewsController.getComplaint,
);
complaintsAdminRouter.patch(
  '/:id',
  validate({ params: idParamsSchema, body: complaintHandlingSchema }),
  reviewsController.handleComplaint,
);
