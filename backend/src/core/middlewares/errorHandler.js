import {
  ForeignKeyConstraintError,
  UniqueConstraintError,
  ValidationError as SequelizeValidationError,
} from 'sequelize';
import { z } from '@smart-ecommerce/shared';
import { env } from '../../config/env.js';
import { AppError, BadRequestError, ConflictError, ValidationError } from '../errors/index.js';
import { logger } from '../utils/logger.js';
import { formatZodIssues } from './validate.js';

/**
 * Gestion centralisée des erreurs (dernier middleware de l'application).
 * Toute erreur levée dans une route, un contrôleur ou un service arrive ici
 * (Express 5 transmet automatiquement les erreurs des fonctions async).
 *
 * Réponse : { "success": false, "error": { "code", "message", "details"? } }
 *
 * Express reconnaît un gestionnaire d'erreurs à ses 4 paramètres : ne pas en retirer.
 */
export function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const error = toAppError(err);

  if (error.statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl}`, err);
  }

  const body = { success: false, error: { code: error.code, message: error.message } };
  if (error.details) body.error.details = error.details;
  // En développement uniquement : la pile d'appels aide au débogage.
  if (env.isDevelopment && error.statusCode >= 500) body.error.stack = err.stack;

  return res.status(error.statusCode).json(body);
}

/** Convertit n'importe quelle erreur en AppError (statut HTTP + code + message). */
export function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof z.ZodError) {
    return new ValidationError(formatZodIssues(err.issues));
  }

  // UniqueConstraintError hérite de ValidationError (Sequelize) : à tester en premier.
  if (err instanceof UniqueConstraintError) {
    const details = err.errors.map((item) => ({
      field: item.path,
      message: 'Cette valeur est déjà utilisée',
    }));
    return new ConflictError('Cette ressource existe déjà', 'DUPLICATE_ENTRY', details);
  }
  if (err instanceof SequelizeValidationError) {
    return new ValidationError(
      err.errors.map((item) => ({ field: item.path, message: item.message })),
    );
  }
  if (err instanceof ForeignKeyConstraintError) {
    return new ConflictError(
      "Opération impossible : cette ressource est liée à d'autres données",
      'FOREIGN_KEY_CONSTRAINT',
    );
  }

  // Erreurs du parseur JSON d'Express
  if (err.type === 'entity.parse.failed') {
    return new BadRequestError("Le corps de la requête n'est pas un JSON valide", 'INVALID_JSON');
  }
  if (err.type === 'entity.too.large') {
    return new AppError('Le corps de la requête est trop volumineux', {
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
    });
  }

  // Erreur inattendue (bug) : on ne divulgue pas les détails internes en production.
  return new AppError(
    env.isProduction ? 'Une erreur interne est survenue' : err.message || 'Erreur interne',
    { statusCode: 500, code: 'INTERNAL_ERROR' },
  );
}
