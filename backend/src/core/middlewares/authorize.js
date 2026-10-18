import { PERMISSION_LIST, ROLE_LIST, hasPermission } from '@smart-ecommerce/shared';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';

/**
 * Autorisation (à placer APRÈS `authenticate`).
 *
 * Préférez requirePermission : la correspondance rôle → permissions est définie
 * à un seul endroit (shared/src/constants/permissions.js).
 *
 * @example
 * router.get('/stock', authenticate, requirePermission(PERMISSIONS.STOCK_READ), stockController.list);
 * router.get('/reports', authenticate, requireRole(ROLES.ADMIN), reportsController.list);
 */

/** L'utilisateur doit avoir TOUTES les permissions indiquées. */
export function requirePermission(...permissions) {
  assertKnownValues(permissions, PERMISSION_LIST, 'requirePermission');

  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise', 'AUTH_REQUIRED'));
    }
    const allowed = permissions.every((permission) => hasPermission(req.user.role, permission));
    if (!allowed) {
      return next(new ForbiddenError());
    }
    return next();
  };
}

/** L'utilisateur doit avoir L'UN des rôles indiqués. */
export function requireRole(...roles) {
  assertKnownValues(roles, ROLE_LIST, 'requireRole');

  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentification requise', 'AUTH_REQUIRED'));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    return next();
  };
}

// Détecte les fautes de frappe dès le démarrage de l'API plutôt qu'à l'exécution.
function assertKnownValues(values, knownValues, functionName) {
  if (values.length === 0) {
    throw new Error(`${functionName}() : au moins une valeur est requise`);
  }
  const unknown = values.filter((value) => !knownValues.includes(value));
  if (unknown.length > 0) {
    throw new Error(`${functionName}() : valeur(s) inconnue(s) « ${unknown.join(', ')} »`);
  }
}
