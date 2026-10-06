import { Op } from 'sequelize';
import { BadRequestError, NotFoundError } from '../../core/errors/index.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { likeContains } from '../../core/utils/query.js';
import { models } from '../../database/index.js';
import { toAddressResponse } from './addresses.service.js';
import { toUserResponse } from './users.mapper.js';

/* Gestion des utilisateurs par l'administrateur (permission users:manage). */

const { Role, User, Address } = models;

export async function listUsers({ page, limit, search, role, status }) {
  const where = {};
  if (status === 'active') where.isActive = true;
  if (status === 'blocked') where.isActive = false;
  if (search) {
    where[Op.or] = ['firstName', 'lastName', 'email'].map((field) => ({
      [field]: { [Op.like]: likeContains(search) },
    }));
  }

  const { rows, count } = await User.findAndCountAll({
    where,
    include: [
      {
        model: Role,
        as: 'role',
        attributes: ['id', 'name'],
        ...(role && { where: { name: role } }),
      },
    ],
    order: [['createdAt', 'DESC']],
    ...toSequelizePagination({ page, limit }),
  });
  return { items: rows.map(toUserResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

export async function getUser(userId) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Role, as: 'role', attributes: ['id', 'name'] },
      { model: Address, as: 'addresses' },
    ],
  });
  if (!user) throw new NotFoundError('Utilisateur introuvable', 'USER_NOT_FOUND');
  return { ...toUserResponse(user), addresses: user.addresses.map(toAddressResponse) };
}

/** Bloquer / débloquer : effet immédiat (le statut est relu à chaque requête authentifiée). */
export async function setUserStatus(actorId, userId, isActive) {
  assertNotSelf(actorId, userId);
  const user = await findUserOrFail(userId);
  await user.update({ isActive });
  return getUser(userId);
}

export async function setUserRole(actorId, userId, roleName) {
  assertNotSelf(actorId, userId);
  const user = await findUserOrFail(userId);
  const role = await Role.findOne({ where: { name: roleName } });
  if (!role) throw new BadRequestError('Rôle inconnu', 'ROLE_NOT_FOUND');
  await user.update({ roleId: role.id });
  return getUser(userId);
}

async function findUserOrFail(userId) {
  const user = await User.findByPk(userId);
  if (!user) throw new NotFoundError('Utilisateur introuvable', 'USER_NOT_FOUND');
  return user;
}

// Un administrateur ne peut pas se bloquer ni retirer son propre rôle (il perdrait l'accès).
function assertNotSelf(actorId, userId) {
  if (Number(actorId) === Number(userId)) {
    throw new BadRequestError(
      'Vous ne pouvez pas modifier votre propre compte depuis cet écran',
      'CANNOT_MODIFY_SELF',
    );
  }
}
