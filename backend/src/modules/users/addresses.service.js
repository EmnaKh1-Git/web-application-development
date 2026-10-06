import { NotFoundError } from '../../core/errors/index.js';
import { models, sequelize } from '../../database/index.js';

/* Adresses de livraison de l'utilisateur connecté (une seule adresse par défaut). */

const { Address } = models;

export function toAddressResponse(address) {
  return {
    id: address.id,
    label: address.label,
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    phone: address.phone,
    isDefault: address.isDefault,
  };
}

export async function listAddresses(userId) {
  const addresses = await Address.findAll({
    where: { userId },
    order: [
      ['isDefault', 'DESC'],
      ['createdAt', 'ASC'],
    ],
  });
  return addresses.map(toAddressResponse);
}

export async function createAddress(userId, data) {
  const address = await sequelize.transaction(async (transaction) => {
    // La première adresse devient automatiquement l'adresse par défaut.
    const isFirst = (await Address.count({ where: { userId }, transaction })) === 0;
    const isDefault = data.isDefault || isFirst;
    if (isDefault) await clearDefault(userId, transaction);
    return Address.create({ ...data, userId, isDefault }, { transaction });
  });
  return toAddressResponse(address);
}

export async function updateAddress(userId, addressId, data) {
  const address = await sequelize.transaction(async (transaction) => {
    const existing = await findOwnedAddress(userId, addressId, transaction);
    // On ne peut pas « retirer » le statut par défaut : il faut en choisir une autre.
    const isDefault = existing.isDefault || data.isDefault;
    if (data.isDefault && !existing.isDefault) await clearDefault(userId, transaction);
    return existing.update({ ...data, isDefault }, { transaction });
  });
  return toAddressResponse(address);
}

export async function deleteAddress(userId, addressId) {
  await sequelize.transaction(async (transaction) => {
    const address = await findOwnedAddress(userId, addressId, transaction);
    await address.destroy({ transaction });
    if (address.isDefault) {
      // Une autre adresse (la plus ancienne) devient l'adresse par défaut.
      const next = await Address.findOne({
        where: { userId },
        order: [['createdAt', 'ASC']],
        transaction,
      });
      if (next) await next.update({ isDefault: true }, { transaction });
    }
  });
}

/** API publique : adresse d'un utilisateur (null si elle ne lui appartient pas). */
export async function findUserAddress(userId, addressId, { transaction } = {}) {
  const address = await Address.findOne({ where: { id: addressId, userId }, transaction });
  return address ? toAddressResponse(address) : null;
}

async function findOwnedAddress(userId, addressId, transaction) {
  // Filtrer par userId empêche de modifier l'adresse d'un autre (réponse 404, sans révéler qu'elle existe).
  const address = await Address.findOne({ where: { id: addressId, userId }, transaction });
  if (!address) throw new NotFoundError('Adresse introuvable', 'ADDRESS_NOT_FOUND');
  return address;
}

async function clearDefault(userId, transaction) {
  await Address.update({ isDefault: false }, { where: { userId, isDefault: true }, transaction });
}
