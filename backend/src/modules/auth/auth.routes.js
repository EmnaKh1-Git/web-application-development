import { Router } from 'express';
import { loginSchema, registerSchema } from '@smart-ecommerce/shared';
import { authenticate, authRateLimiter, validate } from '../../core/middlewares/index.js';
import * as authController from './auth.controller.js';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Authentification]
 *     summary: Créer un compte client
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName: { type: string, example: Amine }
 *               lastName: { type: string, example: Ben Ali }
 *               email: { type: string, format: email, example: amine@example.com }
 *               password: { type: string, format: password, example: Motdepasse1 }
 *     responses:
 *       201: { $ref: '#/components/responses/AuthSession' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       409: { description: Email déjà utilisé (EMAIL_ALREADY_USED) }
 */
router.post(
  '/register',
  authRateLimiter,
  validate({ body: registerSchema }),
  authController.register,
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Authentification]
 *     summary: Se connecter et obtenir un jeton JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200: { $ref: '#/components/responses/AuthSession' }
 *       400: { $ref: '#/components/responses/ValidationError' }
 *       401: { description: Identifiants incorrects (INVALID_CREDENTIALS) }
 *       403: { description: Compte bloqué (ACCOUNT_DISABLED) }
 */
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Authentification]
 *     summary: Utilisateur connecté (restaure la session au chargement du Front-End)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Utilisateur connecté
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data: { $ref: '#/components/schemas/User' }
 *       401: { $ref: '#/components/responses/Unauthorized' }
 */
router.get('/me', authenticate, authController.me);

export default router;
