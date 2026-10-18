import { ROLES } from './roles.js';

/**
 * Permissions de l'application (format « ressource:action »).
 *
 * Règle d'équipe : dans les routes, on protège par PERMISSION (requirePermission)
 * plutôt que par rôle. Pour changer « qui a le droit de faire quoi », on modifie
 * uniquement la table ROLE_PERMISSIONS ci-dessous.
 */
export const PERMISSIONS = Object.freeze({
  // Client
  CART_MANAGE: 'cart:manage',
  ORDERS_PLACE: 'orders:place',
  REVIEWS_WRITE: 'reviews:write',
  COMPLAINTS_CREATE: 'complaints:create',

  // Back-office
  USERS_MANAGE: 'users:manage',
  PRODUCTS_MANAGE: 'products:manage',
  ORDERS_MANAGE: 'orders:manage',
  REVIEWS_MODERATE: 'reviews:moderate',
  COMPLAINTS_MANAGE: 'complaints:manage',
  STOCK_READ: 'stock:read',
  STOCK_MANAGE: 'stock:manage',
  AI_INSIGHTS: 'ai:insights', // Centre IA : briefing, indicateurs et évaluation des modèles
});

export const PERMISSION_LIST = Object.freeze(Object.values(PERMISSIONS));

/** Matrice rôle → permissions (source unique de vérité, Front et Back). */
export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.CLIENT]: Object.freeze([
    PERMISSIONS.CART_MANAGE,
    PERMISSIONS.ORDERS_PLACE,
    PERMISSIONS.REVIEWS_WRITE,
    PERMISSIONS.COMPLAINTS_CREATE,
  ]),
  [ROLES.STOCK_MANAGER]: Object.freeze([
    PERMISSIONS.STOCK_READ,
    PERMISSIONS.STOCK_MANAGE,
    PERMISSIONS.AI_INSIGHTS,
  ]),
  // L'administrateur possède toutes les permissions.
  [ROLES.ADMIN]: PERMISSION_LIST,
});

/** Liste des permissions d'un rôle (liste vide si le rôle est inconnu). */
export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Indique si un rôle possède une permission donnée. */
export function hasPermission(role, permission) {
  return getPermissionsForRole(role).includes(permission);
}
