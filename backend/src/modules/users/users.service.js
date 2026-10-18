import { ROLES } from '@smart-ecommerce/shared';
import { AppError, BadRequestError, NotFoundError } from '../../core/errors/index.js';
import { hashPassword, verifyPassword } from '../../core/security/password.js';
import { models } from '../../database/index.js';

/* Comptes utilisateurs : création (inscription), profil et mot de passe. */

const { Role, User } = models;

const INCLUDE_ROLE = { association: 'role', attributes: ['id', 'name'] };

export function findUserById(id) {
  return User.findByPk(id, { include: [INCLUDE_ROLE] });
}

/** Inclut le hash du mot de passe : à utiliser uniquement pour la connexion. */
export function findUserByEmailWithPassword(email) {
  return User.scope('withPassword').findOne({ where: { email }, include: [INCLUDE_ROLE] });
}

/** Comptes clients (sans donnée sensible) pour la segmentation du module IA. */
export async function listCustomers() {
  const users = await User.findAll({
    attributes: ['id', 'firstName', 'lastName', 'createdAt', 'isActive'],
    include: [{ ...INCLUDE_ROLE, where: { name: ROLES.CLIENT } }],
    order: [['id', 'ASC']],
  });
  return users.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    createdAt: user.createdAt,
    isActive: user.isActive,
  }));
}

export async function emailExists(email) {
  return (await User.count({ where: { email } })) > 0;
}

/** Crée un utilisateur avec le rôle indiqué (CLIENT par défaut) et le retourne avec son rôle. */
export async function createUser(
  { firstName, lastName, email, passwordHash, roleName = ROLES.CLIENT },
  { transaction } = {},
) {
  const role = await Role.findOne({ where: { name: roleName }, transaction });
  if (!role) {
    throw new AppError(
      `Le rôle ${roleName} est introuvable : les migrations ont-elles été exécutées ?`,
      {
        statusCode: 500,
        code: 'ROLE_NOT_FOUND',
      },
    );
  }

  const user = await User.create(
    { firstName, lastName, email, passwordHash, roleId: role.id },
    { transaction },
  );
  return User.findByPk(user.id, { include: [INCLUDE_ROLE], transaction });
}

/** PATCH /users/me : prénom, nom, téléphone. */
export async function updateProfile(userId, { firstName, lastName, phone }) {
  const user = await findUserById(userId);
  if (!user) throw new NotFoundError('Utilisateur introuvable', 'USER_NOT_FOUND');
  await user.update({ firstName, lastName, phone });
  return user;
}

/** PATCH /users/me/password : l'ancien mot de passe est obligatoire. */
export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.scope('withPassword').findByPk(userId);
  if (!user) throw new NotFoundError('Utilisateur introuvable', 'USER_NOT_FOUND');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new BadRequestError('Le mot de passe actuel est incorrect', 'INVALID_CURRENT_PASSWORD', [
      { field: 'currentPassword', location: 'body', message: 'Mot de passe actuel incorrect' },
    ]);
  }
  await user.update({ passwordHash: await hashPassword(newPassword) });
}
