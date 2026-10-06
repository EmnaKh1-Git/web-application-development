import { fileURLToPath } from 'node:url';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

/**
 * Documentation interactive de l'API (Swagger UI) : http://localhost:4000/api/docs
 *
 * Chaque route se documente avec un commentaire « @openapi » placé juste au-dessus
 * d'elle, dans le fichier *.routes.js du module (exemple : modules/auth/auth.routes.js).
 * Désactivée en production.
 */
const toGlob = (relativePath) =>
  fileURLToPath(new URL(relativePath, import.meta.url)).replaceAll('\\', '/');

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'SmartE-Commerce API',
    version: '0.1.0',
    description:
      'API REST de SmartE-Commerce. Authentification : bouton « Authorize » avec le jeton reçu à la connexion.',
  },
  servers: [{ url: '/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstName: { type: 'string', example: 'Amine' },
          lastName: { type: 'string', example: 'Ben Ali' },
          email: { type: 'string', example: 'amine@example.com' },
          phone: { type: 'string', nullable: true },
          role: { type: 'string', enum: ['CLIENT', 'ADMIN', 'STOCK_MANAGER'] },
          permissions: { type: 'array', items: { type: 'string' }, example: ['cart:manage'] },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string' },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string', example: 'email' },
                    location: { type: 'string', example: 'body' },
                    message: { type: 'string', example: 'Adresse email invalide' },
                  },
                },
              },
            },
          },
        },
      },
    },
    responses: {
      AuthSession: {
        description: 'Session ouverte : jeton JWT + utilisateur',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                data: {
                  type: 'object',
                  properties: {
                    token: { type: 'string' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
        },
      },
      ValidationError: {
        description: 'Données invalides (VALIDATION_ERROR)',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'Jeton absent, invalide ou expiré',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'Droits insuffisants ou compte bloqué',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
  },
};

export function setupSwagger(app) {
  const spec = swaggerJsdoc({
    definition,
    apis: [toGlob('../routes.js'), toGlob('../modules/**/*.routes.js')],
  });

  app.get('/api/docs.json', (_req, res) => res.json(spec));
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(spec, { customSiteTitle: 'SmartE-Commerce — API' }),
  );
}
