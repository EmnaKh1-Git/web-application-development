import { MAX_CART_ITEM_QUANTITY } from '@smart-ecommerce/shared';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/index.js';
import { multiplyAmount, sumAmounts } from '../../core/utils/money.js';
import { models } from '../../database/index.js';
import * as productsModule from '../products/index.js';

/* Panier de l'utilisateur connecté. Les prix sont TOUJOURS relus côté serveur. */

const { Cart, CartItem } = models;

async function getOrCreateCart(userId, { transaction } = {}) {
  const [cart] = await Cart.findOrCreate({ where: { userId }, defaults: { userId }, transaction });
  return cart;
}

function toCartResponse(items, products) {
  const lines = items.map((item) => {
    const product = products.get(item.productId);
    const availableQuantity = product?.isActive ? product.availableQuantity : 0;
    const unitPrice = product?.price ?? 0;
    return {
      id: item.id,
      productId: item.productId,
      name: product?.name ?? 'Produit indisponible',
      imageUrl: product?.imageUrl ?? null,
      unitPrice,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      lineTotal: multiplyAmount(unitPrice, item.quantity),
      availableQuantity,
      isAvailable: Boolean(product?.isActive) && availableQuantity >= item.quantity,
    };
  });
  return {
    items: lines,
    totalItems: lines.reduce((total, line) => total + line.quantity, 0),
    totalAmount: sumAmounts(lines.map((line) => line.lineTotal)),
    hasUnavailableItems: lines.some((line) => !line.isAvailable),
  };
}

export async function getCart(userId) {
  const cart = await getOrCreateCart(userId);
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    order: [
      ['createdAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  const products = await productsModule.getProductSummaries(items.map((item) => item.productId));
  return toCartResponse(items, products);
}

export async function addItem(userId, { productId, quantity, size }) {
  const product = await findActiveProduct(productId);
  assertSizeAllowed(product, size);
  const cart = await getOrCreateCart(userId);
  const existing = await CartItem.findOne({
    where: { cartId: cart.id, productId, size: size ?? null, color: null },
  });
  const newQuantity = (existing?.quantity ?? 0) + quantity;
  assertQuantityAllowed(product, newQuantity);

  if (existing) {
    await existing.update({ quantity: newQuantity });
  } else {
    await CartItem.create({
      cartId: cart.id,
      productId,
      quantity,
      size: size ?? null,
      color: null,
    });
  }
  return getCart(userId);
}

export async function updateItem(userId, itemId, { quantity }) {
  const item = await findOwnedItem(userId, itemId);
  const product = await findActiveProduct(item.productId);
  assertQuantityAllowed(product, quantity);
  await item.update({ quantity });
  return getCart(userId);
}

export async function removeItem(userId, itemId) {
  const item = await findOwnedItem(userId, itemId);
  await item.destroy();
  return getCart(userId);
}

export async function clearCart(userId, { transaction } = {}) {
  const cart = await getOrCreateCart(userId, { transaction });
  await CartItem.destroy({ where: { cartId: cart.id }, transaction });
}

/** Lignes du panier pour la création d'une commande (même transaction). */
export async function getCartItemsForCheckout(userId, { transaction }) {
  const cart = await getOrCreateCart(userId, { transaction });
  const items = await CartItem.findAll({
    where: { cartId: cart.id },
    order: [['id', 'ASC']],
    transaction,
  });
  return items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    size: item.size,
    color: item.color,
  }));
}

async function findActiveProduct(productId) {
  const product = (await productsModule.getProductSummaries([productId])).get(productId);
  if (!product?.isActive) throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
  return product;
}

async function findOwnedItem(userId, itemId) {
  const item = await CartItem.findOne({
    where: { id: itemId },
    include: [{ model: Cart, as: 'cart', where: { userId }, attributes: [] }],
  });
  if (!item)
    throw new NotFoundError('Article introuvable dans votre panier', 'CART_ITEM_NOT_FOUND');
  return item;
}

function assertQuantityAllowed(product, quantity) {
  if (quantity > MAX_CART_ITEM_QUANTITY) {
    throw new BadRequestError(
      `Maximum ${MAX_CART_ITEM_QUANTITY} exemplaires par produit`,
      'CART_QUANTITY_LIMIT',
    );
  }

  if (quantity > product.availableQuantity) {
    throw new ConflictError(
      product.availableQuantity === 0
        ? `« ${product.name} » est en rupture de stock`
        : `Stock insuffisant pour « ${product.name} » : ${product.availableQuantity} disponible(s)`,
      'INSUFFICIENT_STOCK',
    );
  }
}

function assertSizeAllowed(product, size) {
  if (product.sizes?.length && !size)
    throw new BadRequestError('Veuillez sélectionner une taille', 'PRODUCT_SIZE_REQUIRED');
  if (size && !product.sizes?.includes(size))
    throw new BadRequestError('Taille invalide pour ce produit', 'INVALID_PRODUCT_SIZE');
}
