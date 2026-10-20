import { Router } from 'express';
import { sendSuccess } from './core/utils/apiResponse.js';
import { sequelize } from './database/index.js';
import { supabase } from './config/supabase.js';
import * as aiModule from './modules/ai/index.js';
import * as authModule from './modules/auth/index.js';
import * as ordersModule from './modules/orders/index.js';
import * as productsModule from './modules/products/index.js';
import * as reviewsModule from './modules/reviews/index.js';
import * as stockModule from './modules/stock/index.js';
import * as usersModule from './modules/users/index.js';

/**
 * Routeur principal de l'API (/api/v1).
 * Chaque module branche lui-même ses routes via sa fonction registerRoutes() :
 * ce fichier n'a pas à être modifié pour ajouter une route dans un module.
 */
const MODULES = [
  authModule,
  usersModule,
  productsModule,
  ordersModule,
  reviewsModule,
  stockModule,
  aiModule,
];

export function createApiRouter() {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     tags: [Système]
   *     summary: État de l'API et de la base de données
   *     responses:
   *       200: { description: API opérationnelle }
   *       503: { description: Base de données inaccessible }
   */
  router.get('/health', async (_req, res) => {
    let database = 'up';
    try {
      await sequelize.authenticate();
    } catch {
      database = 'down';
    }
    const status = database === 'up' ? 'ok' : 'degraded';
    sendSuccess(
      res,
      {
        status,
        database,
        supabase: supabase ? 'configured' : 'disabled',
        uptimeSeconds: Math.round(process.uptime()),
      },
      { statusCode: database === 'up' ? 200 : 503 },
    );
  });

  for (const module of MODULES) {
    module.registerRoutes(router);
  }

  return router;
}
