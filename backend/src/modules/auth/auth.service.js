import { ROLES } from '@smart-ecommerce/shared';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../core/errors/index.js';
import { EVENTS, publish } from '../../core/events/index.js';
import { signAccessToken } from '../../core/security/jwt.js';
import { hashPassword, verifyPassword } from '../../core/security/password.js';
import * as usersModule from '../users/index.js';

/** Inscription publique : le compte créé a TOUJOURS le rôle CLIENT. */
export async function register({ firstName, lastName, email, password }) {
  if (await usersModule.emailExists(email)) {
    throw new ConflictError('Un compte existe déjà avec cet email', 'EMAIL_ALREADY_USED');
  }

  const passwordHash = await hashPassword(password);
  const user = await usersModule.createUser({
    firstName,
    lastName,
    email,
    passwordHash,
    roleName: ROLES.CLIENT,
  });

  publish(EVENTS.USER_REGISTERED, { userId: user.id });
  return buildSession(user);
}

export async function login({ email, password }) {
  const user = await usersModule.findUserByEmailWithPassword(email);

  // On compare toujours un mot de passe, même si l'email est inconnu : le temps de réponse
  // ne révèle pas si un compte existe, et le message d'erreur est identique dans les deux cas.
  const passwordHash = user?.passwordHash ?? (await getDummyPasswordHash());
  const passwordMatches = await verifyPassword(password, passwordHash);

  if (!user || !passwordMatches) {
    throw new UnauthorizedError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS');
  }
  if (!user.isActive) {
    throw new ForbiddenError('Votre compte est bloqué. Contactez le support.', 'ACCOUNT_DISABLED');
  }

  return buildSession(user);
}

export async function getCurrentUser(userId) {
  const user = await usersModule.findUserById(userId);
  if (!user) {
    throw new NotFoundError('Utilisateur introuvable', 'USER_NOT_FOUND');
  }
  return usersModule.toUserResponse(user);
}

function buildSession(user) {
  const userResponse = usersModule.toUserResponse(user);
  return {
    token: signAccessToken({ id: user.id, role: userResponse.role }),
    user: userResponse,
  };
}

let dummyPasswordHashPromise;
function getDummyPasswordHash() {
  dummyPasswordHashPromise ??= hashPassword('mot-de-passe-factice-pour-egaliser-le-temps');
  return dummyPasswordHashPromise;
}
