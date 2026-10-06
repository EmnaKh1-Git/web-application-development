import { AppError } from './AppError.js';

/*
 * Erreurs HTTP courantes. Utilisation dans un service :
 *
 *   throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
 *   throw new ConflictError('Stock insuffisant', 'INSUFFICIENT_STOCK');
 */

export class BadRequestError extends AppError {
  constructor(message = 'Requête invalide', code = 'BAD_REQUEST', details) {
    super(message, { statusCode: 400, code, details });
  }
}

/** Erreurs de validation des données (une entrée par champ invalide). */
export class ValidationError extends AppError {
  constructor(details = [], message = 'Les données envoyées sont invalides') {
    super(message, { statusCode: 400, code: 'VALIDATION_ERROR', details });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentification requise', code = 'UNAUTHORIZED') {
    super(message, { statusCode: 401, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Vous n'avez pas les droits nécessaires", code = 'FORBIDDEN') {
    super(message, { statusCode: 403, code });
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable', code = 'NOT_FOUND') {
    super(message, { statusCode: 404, code });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflit avec l'état actuel de la ressource", code = 'CONFLICT', details) {
    super(message, { statusCode: 409, code, details });
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requêtes, réessayez plus tard', code = 'TOO_MANY_REQUESTS') {
    super(message, { statusCode: 429, code });
  }
}
