import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { setupSwagger } from './config/swagger.js';
import { apiRateLimiter, errorHandler, notFound } from './core/middlewares/index.js';
import { createApiRouter } from './routes.js';

/**
 * Construit l'application Express (sans la démarrer).
 * Séparée de server.js pour pouvoir être testée avec Supertest.
 */
export function createApp() {
  const app = express();

  // Sécurité HTTP : en-têtes de protection + origines autorisées (CORS)
  app.use(helmet());
  app.use(cors({ origin: env.corsOrigins }));

  // Corps JSON (taille limitée pour éviter les abus)
  app.use(express.json({ limit: '100kb' }));

  if (!env.isTest) {
    app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  }

  if (!env.isProduction) {
    setupSwagger(app);
  }

  app.use('/api/v1', apiRateLimiter, createApiRouter());

  // Doivent rester en dernier
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
