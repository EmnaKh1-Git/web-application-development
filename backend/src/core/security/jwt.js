import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

// Algorithme imposé à la vérification : empêche l'attaque « alg: none ».
const ALGORITHM = 'HS256';

/**
 * Génère le jeton d'accès d'un utilisateur.
 * Contenu minimal : identifiant (sub) et rôle. Aucune donnée sensible dans un JWT
 * (il est seulement signé, pas chiffré : n'importe qui peut lire son contenu).
 */
export function signAccessToken({ id, role }) {
  return jwt.sign({ role }, env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: env.JWT_EXPIRES_IN,
    subject: String(id),
  });
}

/** Vérifie la signature et l'expiration du jeton, puis retourne son contenu. */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, env.JWT_SECRET, { algorithms: [ALGORITHM] });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError(
        'Votre session a expiré, veuillez vous reconnecter',
        'TOKEN_EXPIRED',
      );
    }
    throw new UnauthorizedError("Jeton d'authentification invalide", 'INVALID_TOKEN');
  }
}
