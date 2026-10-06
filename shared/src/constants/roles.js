/**
 * Rôles de l'application.
 * Ils doivent correspondre aux lignes de la table `roles`
 * (insérées par la migration « create-roles » du Back-End).
 */
export const ROLES = Object.freeze({
  CLIENT: 'CLIENT',
  ADMIN: 'ADMIN',
  STOCK_MANAGER: 'STOCK_MANAGER',
});

export const ROLE_LIST = Object.freeze(Object.values(ROLES));

/** Libellés affichés dans l'interface. */
export const ROLE_LABELS = Object.freeze({
  [ROLES.CLIENT]: 'Client',
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.STOCK_MANAGER]: 'Gestionnaire de stock',
});

/** Rôles autorisés à accéder au back-office (/admin). */
export const BACK_OFFICE_ROLES = Object.freeze([ROLES.ADMIN, ROLES.STOCK_MANAGER]);
