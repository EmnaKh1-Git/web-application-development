import { addressSchema, changePasswordSchema, profileSchema } from '@smart-ecommerce/shared';
import { Router } from 'express';
import { authenticate, validate } from '../../core/middlewares/index.js';
import * as usersController from './users.controller.js';
import { idParamsSchema } from './users.schemas.js';

// Routes « Mon compte » : l'utilisateur connecté gère ses propres données.
const router = Router();
router.use(authenticate);

/**
 * @openapi
 * /users/me:
 *   patch:
 *     tags: [Mon compte]
 *     summary: Modifier son profil (prénom, nom, téléphone)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Profil mis à jour } }
 */
router.patch('/me', validate({ body: profileSchema }), usersController.updateProfile);

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags: [Mon compte]
 *     summary: Changer son mot de passe (ancien mot de passe requis)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 204: { description: Mot de passe changé }, 400: { description: INVALID_CURRENT_PASSWORD } }
 */
router.patch(
  '/me/password',
  validate({ body: changePasswordSchema }),
  usersController.changePassword,
);

/**
 * @openapi
 * /users/me/addresses:
 *   get:
 *     tags: [Mon compte]
 *     summary: Mes adresses de livraison
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: Adresses } }
 *   post:
 *     tags: [Mon compte]
 *     summary: Ajouter une adresse
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Adresse créée } }
 */
router.get('/me/addresses', usersController.listAddresses);
router.post('/me/addresses', validate({ body: addressSchema }), usersController.createAddress);

/**
 * @openapi
 * /users/me/addresses/{id}:
 *   patch:
 *     tags: [Mon compte]
 *     summary: Modifier une adresse (ou la définir par défaut)
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 200: { description: Adresse modifiée }, 404: { description: ADDRESS_NOT_FOUND } }
 *   delete:
 *     tags: [Mon compte]
 *     summary: Supprimer une adresse
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer } }]
 *     responses: { 204: { description: Adresse supprimée } }
 */
router.patch(
  '/me/addresses/:id',
  validate({ params: idParamsSchema, body: addressSchema }),
  usersController.updateAddress,
);
router.delete(
  '/me/addresses/:id',
  validate({ params: idParamsSchema }),
  usersController.deleteAddress,
);

export default router;
