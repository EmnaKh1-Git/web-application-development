import { randomInt } from 'node:crypto';
import {
  CANCELLABLE_ORDER_STATUSES,
  canChangeOrderStatus,
  DELIVERY_STATUS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_LIST,
  PERMISSIONS,
} from '@smart-ecommerce/shared';
import { col, fn, Op } from 'sequelize';
import { BadRequestError, ConflictError, NotFoundError } from '../../core/errors/index.js';
import { EVENTS, publish } from '../../core/events/index.js';
import { assertOwnershipOrPermission } from '../../core/security/ownership.js';
import { multiplyAmount, sumAmounts } from '../../core/utils/money.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { likeContains } from '../../core/utils/query.js';
import { models, sequelize } from '../../database/index.js';
import * as productsModule from '../products/index.js';
import * as stockModule from '../stock/index.js';
import * as usersModule from '../users/index.js';
import { clearCart, getCartItemsForCheckout } from './cart.service.js';
import { toOrderResponse } from './orders.mapper.js';

const { Order, OrderItem, Delivery, Product, User } = models;

const DEFAULT_CARRIER = 'SmartE Express';
const STATUS_EVENTS = {
  [ORDER_STATUS.CONFIRMED]: EVENTS.ORDER_CONFIRMED,
  [ORDER_STATUS.SHIPPED]: EVENTS.ORDER_SHIPPED,
  [ORDER_STATUS.DELIVERED]: EVENTS.ORDER_DELIVERED,
  [ORDER_STATUS.CANCELLED]: EVENTS.ORDER_CANCELLED,
};

// Image actuelle du produit pour l'affichage (le nom et le prix restent ceux de la commande).
const itemsInclude = {
  model: OrderItem,
  as: 'items',
  include: [{ model: Product, as: 'product', attributes: ['id', 'imageUrl'] }],
};
const deliveryInclude = { model: Delivery, as: 'delivery' };
const customerInclude = {
  model: User,
  as: 'customer',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
};

/* ─────────────────────────── Client ─────────────────────────── */

/** Crée une commande EN ATTENTE à partir du panier. Le stock est vérifié, mais pas encore diminué. */
export async function createOrderFromCart(user, { addressId, notes }) {
  const orderId = await sequelize.transaction(async (transaction) => {
    const cartItems = await getCartItemsForCheckout(user.id, { transaction });
    if (cartItems.length === 0) {
      throw new BadRequestError('Votre panier est vide', 'EMPTY_CART');
    }

    const address = await usersModule.findUserAddress(user.id, addressId, { transaction });
    if (!address) {
      throw new NotFoundError('Adresse de livraison introuvable', 'ADDRESS_NOT_FOUND');
    }

    const products = await productsModule.getProductSummaries(
      cartItems.map((item) => item.productId),
      { transaction },
    );
    // Quantité demandée par produit, toutes variantes (tailles, couleurs) confondues
    const requestedByProduct = new Map();
    for (const item of cartItems) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }
    const problems = [];
    for (const [productId, requested] of requestedByProduct) {
      const product = products.get(productId);
      if (!product?.isActive) {
        problems.push({ productId, message: "Un produit n'est plus disponible" });
      } else if (product.availableQuantity < requested) {
        problems.push({
          productId,
          message: `${product.name} : ${product.availableQuantity} disponible(s) pour ${requested} demandé(s)`,
        });
      }
    }
    const lines = cartItems.map((item) => {
      const product = products.get(item.productId);
      if (!product?.isActive) return null;
      return {
        productId: product.id,
        productName: product.name, // copie au moment de la commande
        unitPrice: product.price, // prix relu en base, jamais envoyé par le client
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        lineTotal: multiplyAmount(product.price, item.quantity),
      };
    });
    if (problems.length > 0) {
      throw new ConflictError(
        'Certains articles de votre panier ne sont plus disponibles',
        'CART_UNAVAILABLE_ITEMS',
        problems,
      );
    }

    const order = await Order.create(
      {
        userId: user.id,
        status: ORDER_STATUS.PENDING,
        totalAmount: sumAmounts(lines.map((line) => line.lineTotal)),
        shippingAddress: {
          recipient: `${user.firstName} ${user.lastName}`,
          label: address.label,
          street: address.street,
          city: address.city,
          postalCode: address.postalCode,
          country: address.country,
          phone: address.phone,
        },
        notes,
      },
      { transaction },
    );
    await OrderItem.bulkCreate(
      lines.map((line) => ({ ...line, orderId: order.id })),
      { transaction },
    );
    await Delivery.create({ orderId: order.id }, { transaction });
    await clearCart(user.id, { transaction });

    transaction.afterCommit(() =>
      publish(EVENTS.ORDER_CREATED, { orderId: order.id, userId: user.id }),
    );
    return order.id;
  });
  return getOrder(orderId, user);
}

export async function listMyOrders(userId, { page, limit, status }) {
  const { rows, count } = await Order.findAndCountAll({
    where: { userId, ...(status && { status }) },
    include: [itemsInclude, deliveryInclude],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    ...toSequelizePagination({ page, limit }),
    distinct: true,
  });
  return { items: rows.map(toOrderResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

/** Détail d'une commande : son propriétaire ou un utilisateur ayant orders:manage. */
export async function getOrder(orderId, viewer) {
  const order = await Order.findByPk(orderId, {
    include: [itemsInclude, deliveryInclude, customerInclude],
  });
  if (!order) throw new NotFoundError('Commande introuvable', 'ORDER_NOT_FOUND');
  assertOwnershipOrPermission(viewer, order.userId, PERMISSIONS.ORDERS_MANAGE);
  return toOrderResponse(order);
}

/** Annulation par le client, possible tant que la commande n'est pas expédiée. */
export async function cancelOrder(orderId, viewer) {
  await sequelize.transaction(async (transaction) => {
    const order = await lockOrder(orderId, transaction);
    assertOwnershipOrPermission(viewer, order.userId, PERMISSIONS.ORDERS_MANAGE);
    if (!CANCELLABLE_ORDER_STATUSES.includes(order.status)) {
      throw new ConflictError(
        'Cette commande ne peut plus être annulée (déjà expédiée ou terminée)',
        'ORDER_NOT_CANCELLABLE',
      );
    }
    await applyStatusChange(order, ORDER_STATUS.CANCELLED, { transaction, actorId: viewer.id });
  });
  return getOrder(orderId, viewer);
}

/* ─────────────────────────── Administration (orders:manage) ─────────────────────────── */

export async function listAllOrders({ page, limit, status, search }) {
  const where = { ...(status && { status }) };
  let customerWhere;
  if (search) {
    const orderNumber = Number(search.replace(/^#/, ''));
    if (Number.isInteger(orderNumber) && orderNumber > 0) {
      where.id = orderNumber;
    } else {
      customerWhere = {
        [Op.or]: ['firstName', 'lastName', 'email'].map((field) => ({
          [field]: { [Op.like]: likeContains(search) },
        })),
      };
    }
  }

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      itemsInclude,
      deliveryInclude,
      { ...customerInclude, ...(customerWhere && { where: customerWhere, required: true }) },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    ...toSequelizePagination({ page, limit }),
    distinct: true,
  });
  return { items: rows.map(toOrderResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

/** Nombre de commandes par statut et chiffre d'affaires (commandes confirmées, expédiées, livrées). */
export async function getOrderStats() {
  const rows = await Order.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count'],
      [fn('COALESCE', fn('SUM', col('total_amount')), 0), 'amount'],
    ],
    group: ['status'],
    raw: true,
  });
  const byStatus = Object.fromEntries(ORDER_STATUS_LIST.map((status) => [status, 0]));
  let revenue = 0;
  for (const row of rows) {
    byStatus[row.status] = Number(row.count);
    if (
      [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].includes(row.status)
    ) {
      revenue = sumAmounts([revenue, row.amount]);
    }
  }
  const totalOrders = Object.values(byStatus).reduce((total, count) => total + count, 0);
  return { byStatus, totalOrders, revenue };
}

/** Changement de statut par l'administrateur (transitions contrôlées). */
export async function updateOrderStatus(orderId, status, actor) {
  await sequelize.transaction(async (transaction) => {
    const order = await lockOrder(orderId, transaction);
    if (!canChangeOrderStatus(order.status, status)) {
      throw new ConflictError(
        `Impossible de passer une commande « ${ORDER_STATUS_LABELS[order.status]} » à « ${ORDER_STATUS_LABELS[status]} »`,
        'INVALID_STATUS_TRANSITION',
      );
    }
    await applyStatusChange(order, status, { transaction, actorId: actor.id });
  });
  return getOrder(orderId, actor);
}

export async function updateDelivery(orderId, data, actor) {
  const order = await Order.findByPk(orderId, { include: [deliveryInclude] });
  if (!order) throw new NotFoundError('Commande introuvable', 'ORDER_NOT_FOUND');
  if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status)) {
    throw new ConflictError(
      "La livraison d'une commande terminée ou annulée ne peut plus être modifiée",
      'DELIVERY_LOCKED',
    );
  }
  // undefined = champ non envoyé (inchangé) ; null = champ vidé
  const changes = Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
  await order.delivery.update(changes);
  return getOrder(orderId, actor);
}

/* ─────────────── API publique (utilisée par les autres modules) ─────────────── */

/** Le client a-t-il reçu ce produit ? (un avis est réservé aux acheteurs livrés) */
export async function hasUserPurchasedProduct(userId, productId) {
  const count = await OrderItem.count({
    where: { productId },
    include: [
      {
        model: Order,
        as: 'order',
        where: { userId, status: ORDER_STATUS.DELIVERED },
        attributes: [],
      },
    ],
  });
  return count > 0;
}

/**
 * Historique des commandes pour les analyses du module IA (lecture seule) :
 * statut, montant, ville de livraison et lignes. Aucune donnée personnelle hors identifiant client.
 */
export async function getOrderHistory({ since } = {}) {
  const orders = await Order.findAll({
    where: since ? { createdAt: { [Op.gte]: since } } : {},
    attributes: ['id', 'userId', 'status', 'totalAmount', 'shippingAddress', 'createdAt'],
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['productId', 'productName', 'quantity', 'unitPrice', 'lineTotal'],
      },
    ],
    order: [
      ['createdAt', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return orders.map((order) => ({
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalAmount: order.totalAmount,
    city: order.shippingAddress?.city ?? null,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
  }));
}

/** Commande d'un utilisateur (null si elle n'existe pas ou ne lui appartient pas). */
export async function findUserOrder(orderId, userId) {
  const order = await Order.findOne({ where: { id: orderId, userId } });
  return order && { id: order.id, status: order.status, createdAt: order.createdAt };
}

/* ─────────────────────────── Fonctions internes ─────────────────────────── */

async function lockOrder(orderId, transaction) {
  const order = await Order.findByPk(orderId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!order) throw new NotFoundError('Commande introuvable', 'ORDER_NOT_FOUND');
  return order;
}

/**
 * Applique un changement de statut et ses conséquences, dans la transaction reçue :
 * - CONFIRMED : diminution du stock (module Stock) + popularité (module Produits) ;
 * - SHIPPED / DELIVERED : mise à jour du suivi de livraison ;
 * - CANCELLED : restauration du stock si la commande avait été confirmée.
 */
async function applyStatusChange(order, newStatus, { transaction, actorId }) {
  const items = await OrderItem.findAll({ where: { orderId: order.id }, transaction });
  const stockItems = items.map((item) => ({
    productId: item.productId,
    productName: item.productName,
    quantity: item.quantity,
  }));
  const delivery = await Delivery.findOne({ where: { orderId: order.id }, transaction });
  const now = new Date();

  switch (newStatus) {
    case ORDER_STATUS.CONFIRMED:
      await stockModule.decreaseStockForOrder(order.id, stockItems, {
        transaction,
        userId: actorId,
      });
      await productsModule.incrementSalesCount(stockItems, { transaction });
      await order.update({ status: newStatus, confirmedAt: now }, { transaction });
      break;

    case ORDER_STATUS.SHIPPED:
      await order.update({ status: newStatus }, { transaction });
      await delivery.update(
        {
          status: DELIVERY_STATUS.IN_TRANSIT,
          shippedAt: now,
          carrier: delivery.carrier ?? DEFAULT_CARRIER,
          trackingNumber: delivery.trackingNumber ?? generateTrackingNumber(order.id),
          estimatedDeliveryDate: delivery.estimatedDeliveryDate ?? addDays(now, 3),
        },
        { transaction },
      );
      break;

    case ORDER_STATUS.DELIVERED:
      await order.update({ status: newStatus }, { transaction });
      await delivery.update(
        { status: DELIVERY_STATUS.DELIVERED, deliveredAt: now },
        { transaction },
      );
      break;

    case ORDER_STATUS.CANCELLED:
      if (order.status === ORDER_STATUS.CONFIRMED) {
        await stockModule.restoreStockForOrder(order.id, stockItems, {
          transaction,
          userId: actorId,
        });
        await productsModule.decrementSalesCount(stockItems, { transaction });
      }
      await order.update({ status: newStatus, cancelledAt: now }, { transaction });
      await delivery.update({ status: DELIVERY_STATUS.CANCELLED }, { transaction });
      break;

    default:
      throw new BadRequestError('Statut non géré', 'UNSUPPORTED_STATUS');
  }

  transaction.afterCommit(() =>
    publish(STATUS_EVENTS[newStatus], { orderId: order.id, userId: order.userId }),
  );
}

function generateTrackingNumber(orderId) {
  return `SE-${String(orderId).padStart(6, '0')}-${randomInt(1000, 10000)}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}
