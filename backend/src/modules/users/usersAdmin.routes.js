import { PERMISSIONS, userRoleSchema, userStatusSchema } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, requirePermission, validate } from '../../core/middlewares/index.js';
import * as usersController from './users.controller.js';
import { idParamsSchema, listUsersQuerySchema } from './users.schemas.js';

// Gestion des utilisateurs (back-office) : permission users:manage.
const router = Router();
router.use(authenticate, requirePermission(PERMISSIONS.USERS_MANAGE));

/**
 * @openapi
 * /admin/users:
 *   get:
 *     tags: [Administration - Utilisateurs]
 *     summary: Liste des utilisateurs (search, role, status=all|active|blocked)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Utilisateurs paginés } }
 */
router.get('/', validate({ query: listUsersQuerySchema }), usersController.listUsers);

/**
 * @openapi
 * /admin/users/{id}:
 *   get:
 *     tags: [Administration - Utilisateurs]
 *     summary: Détail d'un utilisateur (avec ses adresses)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Utilisateur } }
 */
router.get('/:id', validate({ params: idParamsSchema }), usersController.getUser);

/**
 * @openapi
 * /admin/users/{id}/status:
 *   patch:
 *     tags: [Administration - Utilisateurs]
 *     summary: Bloquer / débloquer un compte
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { isActive: { type: boolean } } } } }
 *     responses: { 200: { description: Statut modifié }, 400: { description: CANNOT_MODIFY_SELF } }
 */
router.patch(
  '/:id/status',
  validate({ params: idParamsSchema, body: userStatusSchema }),
  usersController.setUserStatus,
);

/**
 * @openapi
 * /admin/users/{id}/role:
 *   patch:
 *     tags: [Administration - Utilisateurs]
 *     summary: Changer le rôle d'un utilisateur
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     requestBody:
 *       content: { application/json: { schema: { type: object, properties: { role: { type: string, enum: [CLIENT, ADMIN, STOCK_MANAGER] } } } } }
 *     responses: { 200: { description: Rôle modifié } }
 */
router.patch(
  '/:id/role',
  validate({ params: idParamsSchema, body: userRoleSchema }),
  usersController.setUserRole,
);

export default router;
