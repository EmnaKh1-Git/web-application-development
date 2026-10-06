import { rateLimit } from 'express-rate-limit';
import { env } from '../../config/env.js';
import { TooManyRequestsError } from '../errors/index.js';

/**
 * Limitation du nombre de requêtes par adresse IP (anti brute-force / abus).
 * Les limites se règlent dans le .env. Désactivée pendant les tests automatisés.
 */
function createRateLimiter(limit, message) {
  return rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, _res, next) => next(new TooManyRequestsError(message)),
  });
}

/** Limite globale appliquée à toute l'API. */
export const apiRateLimiter = createRateLimiter(
  env.RATE_LIMIT_MAX,
  'Trop de requêtes. Réessayez dans quelques minutes.',
);

/** Limite stricte pour la connexion et l'inscription. */
export const authRateLimiter = createRateLimiter(
  env.AUTH_RATE_LIMIT_MAX,
  'Trop de tentatives. Réessayez dans quelques minutes.',
);
