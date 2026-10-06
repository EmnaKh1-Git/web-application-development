import { models } from '../../database/index.js';
import { ForbiddenError, UnauthorizedError } from '../errors/index.js';
import { verifyAccessToken } from '../security/jwt.js';

/**
 * Authentification par JWT (en-tête « Authorization: Bearer <token> »).
 *
 * En cas de succès : req.user = { id, email, firstName, lastName, role }
 *
 * Le rôle et le statut du compte sont relus en base à chaque requête :
 * un blocage ou un changement de rôle fait par l'administrateur
 * s'applique immédiatement, sans attendre l'expiration du jeton.
 */
export async function authenticate(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token) {
    throw new UnauthorizedError('Authentification requise', 'AUTH_REQUIRED');
  }
  req.user = await loadUserFromToken(token);
  next();
}

/**
 * Variante pour les routes publiques qui peuvent être personnalisées
 * si l'utilisateur est connecté (ex. recommandations IA).
 * Sans jeton : req.user reste undefined. Avec un jeton : il doit être valide.
 */
export async function optionalAuthenticate(req, _res, next) {
  const token = extractBearerToken(req.headers.authorization);
  if (token) {
    req.user = await loadUserFromToken(token);
  }
  next();
}

function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

async function loadUserFromToken(token) {
  const payload = verifyAccessToken(token);

  const user = await models.User.findByPk(payload.sub, {
    include: [{ association: 'role', attributes: ['name'] }],
  });
  if (!user) {
    throw new UnauthorizedError("Jeton d'authentification invalide", 'INVALID_TOKEN');
  }
  if (!user.isActive) {
    throw new ForbiddenError('Votre compte est bloqué. Contactez le support.', 'ACCOUNT_DISABLED');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role.name,
  };
}
