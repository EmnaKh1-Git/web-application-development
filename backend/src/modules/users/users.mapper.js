import { getPermissionsForRole } from '@smart-ecommerce/shared';

/**
 * Représentation publique d'un utilisateur dans les réponses de l'API.
 * Liste blanche des champs exposés : le hash du mot de passe n'en fait jamais partie.
 * Le modèle doit être chargé avec son rôle (include 'role').
 */
export function toUserResponse(user) {
  const role = user.role?.name ?? null;
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone ?? null,
    role,
    permissions: getPermissionsForRole(role),
    isActive: user.isActive,
    createdAt: user.createdAt,
  };
}
