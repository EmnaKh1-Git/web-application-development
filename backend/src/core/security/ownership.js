import { hasPermission } from '@smart-ecommerce/shared';
import { ForbiddenError } from '../errors/index.js';

/**
 * Vérifie que l'utilisateur connecté est le propriétaire d'une ressource,
 * ou qu'il possède une permission qui l'autorise à y accéder (ex. un administrateur).
 *
 * À appeler dans les services. Protège contre l'accès aux données d'un autre
 * utilisateur en changeant simplement l'identifiant dans l'URL (faille IDOR).
 *
 * @example assertOwnershipOrPermission(req.user, order.userId, PERMISSIONS.ORDERS_MANAGE);
 */
export function assertOwnershipOrPermission(user, ownerId, permission) {
  if (user && Number(user.id) === Number(ownerId)) return;
  if (user && permission && hasPermission(user.role, permission)) return;
  throw new ForbiddenError("Vous n'avez pas accès à cette ressource", 'NOT_RESOURCE_OWNER');
}
