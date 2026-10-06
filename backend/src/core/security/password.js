import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

/**
 * Hachage des mots de passe avec bcrypt (sel aléatoire inclus dans le hash).
 * Règle : on ne stocke, ne journalise et ne renvoie JAMAIS un mot de passe en clair.
 */
export function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.BCRYPT_SALT_ROUNDS);
}

export function verifyPassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
