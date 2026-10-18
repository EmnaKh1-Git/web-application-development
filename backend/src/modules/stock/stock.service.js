import {
  DEFAULT_LOW_STOCK_THRESHOLD,
  getStockStatus,
  STOCK_MOVEMENT_TYPE,
  STOCK_STATUS,
} from '@smart-ecommerce/shared';
import { col, Op, QueryTypes } from 'sequelize';
import { ConflictError, NotFoundError } from '../../core/errors/index.js';
import { EVENTS, publish } from '../../core/events/index.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { likeContains } from '../../core/utils/query.js';
import { models, sequelize } from '../../database/index.js';

const { Stock, StockMovement, Product, Category, User } = models;

// Infos produit affichées dans les écrans de stock (lecture seule du module Produits).
const productInclude = (where) => ({
  model: Product,
  as: 'product',
  attributes: ['id', 'name', 'price', 'imageUrl', 'isActive'],
  include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
  ...(where && { where }),
});

const STATUS_FILTERS = {
  all: {},
  ok: { quantity: { [Op.gt]: col('Stock.low_stock_threshold') } },
  low: { quantity: { [Op.gt]: 0, [Op.lte]: col('Stock.low_stock_threshold') } },
  out: { quantity: 0 },
  alert: { quantity: { [Op.lte]: col('Stock.low_stock_threshold') } },
};

const SORTS = {
  name: [[{ model: Product, as: 'product' }, 'name', 'ASC']],
  quantity_asc: [['quantity', 'ASC']],
  quantity_desc: [['quantity', 'DESC']],
  updated: [['updatedAt', 'DESC']],
};

export function toStockResponse(stock) {
  const product = stock.product;
  return {
    productId: stock.productId,
    quantity: stock.quantity,
    lowStockThreshold: stock.lowStockThreshold,
    status: getStockStatus(stock.quantity, stock.lowStockThreshold),
    updatedAt: stock.updatedAt,
    product: product && {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      category: product.category && { id: product.category.id, name: product.category.name },
    },
  };
}

function toMovementResponse(movement) {
  return {
    id: movement.id,
    productId: movement.productId,
    productName: movement.product?.name,
    type: movement.type,
    quantityChange: movement.quantityChange,
    quantityAfter: movement.quantityAfter,
    reason: movement.reason,
    orderId: movement.orderId,
    user: movement.user && `${movement.user.firstName} ${movement.user.lastName}`,
    createdAt: movement.createdAt,
  };
}

/* ─────────────────────────── Consultation ─────────────────────────── */

export async function listStock({ page, limit, search, status, categoryId, sort }) {
  const productWhere = {
    ...(search && { name: { [Op.like]: likeContains(search) } }),
    ...(categoryId && { categoryId }),
  };
  const { rows, count } = await Stock.findAndCountAll({
    where: STATUS_FILTERS[status],
    include: [productInclude(Object.keys(productWhere).length > 0 ? productWhere : undefined)],
    order: [...SORTS[sort], ['productId', 'ASC']],
    ...toSequelizePagination({ page, limit }),
  });
  return { items: rows.map(toStockResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

/** Chiffres clés pour le tableau de bord (produits actifs uniquement). */
export async function getStockSummary() {
  const [row] = await sequelize.query(
    `SELECT COUNT(*) AS totalProducts,
            COALESCE(SUM(s.quantity), 0) AS totalUnits,
            COALESCE(SUM(s.quantity = 0), 0) AS outOfStock,
            COALESCE(SUM(s.quantity > 0 AND s.quantity <= s.low_stock_threshold), 0) AS lowStock
     FROM stocks s
     JOIN products p ON p.id = s.product_id
     WHERE p.is_active = 1`,
    { type: QueryTypes.SELECT },
  );
  return {
    totalProducts: Number(row.totalProducts),
    totalUnits: Number(row.totalUnits),
    outOfStock: Number(row.outOfStock),
    lowStock: Number(row.lowStock),
  };
}

export async function getProductStock(productId) {
  const stock = await Stock.findOne({ where: { productId }, include: [productInclude()] });
  if (!stock) {
    throw new NotFoundError('Aucun stock trouvé pour ce produit', 'STOCK_NOT_FOUND');
  }
  return toStockResponse(stock);
}

export async function listMovements({ page, limit, productId, type }) {
  const { rows, count } = await StockMovement.findAndCountAll({
    where: { ...(productId && { productId }), ...(type && { type }) },
    include: [
      { model: Product, as: 'product', attributes: ['id', 'name'] },
      { model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] },
    ],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
    ...toSequelizePagination({ page, limit }),
  });
  return { items: rows.map(toMovementResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

/* ─────────────────────────── Gestion (stock:manage) ─────────────────────────── */

export async function addStock(productId, { quantity, reason }, { userId }) {
  await sequelize.transaction(async (transaction) => {
    const stock = await findStockForUpdate(productId, transaction);
    await applyMovement(
      stock,
      {
        type: STOCK_MOVEMENT_TYPE.IN,
        change: quantity,
        reason: reason ?? 'Réapprovisionnement',
        userId,
      },
      transaction,
    );
  });
  return getProductStock(productId);
}

export async function adjustStock(productId, { quantity, lowStockThreshold, reason }, { userId }) {
  await sequelize.transaction(async (transaction) => {
    const stock = await findStockForUpdate(productId, transaction);
    if (lowStockThreshold !== undefined) {
      await stock.update({ lowStockThreshold }, { transaction });
    }
    if (quantity !== undefined && quantity !== stock.quantity) {
      await applyMovement(
        stock,
        {
          type: STOCK_MOVEMENT_TYPE.ADJUST,
          change: quantity - stock.quantity,
          reason: reason ?? 'Correction après inventaire',
          userId,
        },
        transaction,
      );
    }
  });
  return getProductStock(productId);
}

/* ─────────────── API publique (utilisée par les autres modules) ─────────────── */

/** Niveau de stock de tous les produits (module IA) : Map productId → { quantity, lowStockThreshold }. */
export async function getStockLevels() {
  const stocks = await Stock.findAll({
    attributes: ['productId', 'quantity', 'lowStockThreshold'],
  });
  return new Map(
    stocks.map((stock) => [
      stock.productId,
      { quantity: stock.quantity, lowStockThreshold: stock.lowStockThreshold },
    ]),
  );
}

/** Quantités disponibles : Map productId → { quantity, lowStockThreshold }. */
export async function getStocksByProductIds(productIds, { transaction } = {}) {
  const stocks = await Stock.findAll({ where: { productId: productIds }, transaction });
  return new Map(stocks.map((stock) => [stock.productId, stock]));
}

/** Crée le stock d'un nouveau produit (appelé par le module Produits, dans sa transaction). */
export async function createStockForProduct(
  productId,
  { quantity = 0, lowStockThreshold = DEFAULT_LOW_STOCK_THRESHOLD, transaction, userId } = {},
) {
  const stock = await Stock.create({ productId, quantity: 0, lowStockThreshold }, { transaction });
  if (quantity > 0) {
    await applyMovement(
      stock,
      { type: STOCK_MOVEMENT_TYPE.IN, change: quantity, reason: 'Stock initial', userId },
      transaction,
    );
  }
  return stock;
}

/**
 * Diminue le stock lors de la CONFIRMATION d'une commande (règle validée par l'équipe).
 * À appeler dans la transaction du module Commandes : si un produit manque,
 * une erreur 409 INSUFFICIENT_STOCK annule toute l'opération.
 *
 * @param {{ productId: number, productName: string, quantity: number }[]} items
 */
export async function decreaseStockForOrder(orderId, orderItems, { transaction, userId }) {
  // Plusieurs lignes peuvent viser le même produit (tailles, couleurs) : un seul stock à contrôler.
  const items = groupByProduct(orderItems);
  const stocks = await lockStocks(items, transaction);

  const shortages = items
    .filter((item) => (stocks.get(item.productId)?.quantity ?? 0) < item.quantity)
    .map((item) => {
      const available = stocks.get(item.productId)?.quantity ?? 0;
      return {
        productId: item.productId,
        productName: item.productName,
        requested: item.quantity,
        available,
        message: `${item.productName} : ${available} disponible(s) pour ${item.quantity} demandé(s)`,
      };
    });
  if (shortages.length > 0) {
    throw new ConflictError(
      'Stock insuffisant pour confirmer la commande',
      'INSUFFICIENT_STOCK',
      shortages,
    );
  }

  for (const item of items) {
    await applyMovement(
      stocks.get(item.productId),
      {
        type: STOCK_MOVEMENT_TYPE.OUT,
        change: -item.quantity,
        reason: `Commande n°${orderId} confirmée`,
        orderId,
        userId,
      },
      transaction,
    );
  }
}

/** Remet en stock les produits d'une commande confirmée puis annulée. */
export async function restoreStockForOrder(orderId, orderItems, { transaction, userId }) {
  const items = groupByProduct(orderItems);
  const stocks = await lockStocks(items, transaction);
  for (const item of items) {
    const stock = stocks.get(item.productId);
    if (!stock) continue; // produit supprimé entre-temps : rien à restaurer
    await applyMovement(
      stock,
      {
        type: STOCK_MOVEMENT_TYPE.RETURN,
        change: item.quantity,
        reason: `Annulation de la commande n°${orderId}`,
        orderId,
        userId,
      },
      transaction,
    );
  }
}

/* ─────────────────────────── Fonctions internes ─────────────────────────── */

/** Additionne les quantités des lignes qui concernent le même produit. */
function groupByProduct(items) {
  const grouped = new Map();
  for (const item of items) {
    const current = grouped.get(item.productId);
    grouped.set(item.productId, {
      ...item,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }
  return [...grouped.values()];
}

async function findStockForUpdate(productId, transaction) {
  const stock = await Stock.findOne({
    where: { productId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!stock) {
    throw new NotFoundError('Aucun stock trouvé pour ce produit', 'STOCK_NOT_FOUND');
  }
  return stock;
}

/** Verrouille (SELECT ... FOR UPDATE) les stocks concernés, toujours dans le même ordre (évite les interblocages). */
async function lockStocks(items, transaction) {
  const productIds = [...new Set(items.map((item) => item.productId))].sort((a, b) => a - b);
  const stocks = await Stock.findAll({
    where: { productId: productIds },
    order: [['productId', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  return new Map(stocks.map((stock) => [stock.productId, stock]));
}

/** Modifie la quantité ET enregistre le mouvement correspondant (jamais l'un sans l'autre). */
async function applyMovement(stock, { type, change, reason, orderId, userId }, transaction) {
  const quantityAfter = stock.quantity + change;
  if (quantityAfter < 0) {
    throw new ConflictError('Le stock ne peut pas devenir négatif', 'NEGATIVE_STOCK');
  }
  await stock.update({ quantity: quantityAfter }, { transaction });
  await StockMovement.create(
    {
      productId: stock.productId,
      type,
      quantityChange: change,
      quantityAfter,
      reason,
      orderId,
      userId,
    },
    { transaction },
  );

  if (change < 0 && getStockStatus(quantityAfter, stock.lowStockThreshold) !== STOCK_STATUS.OK) {
    transaction.afterCommit(() =>
      publish(EVENTS.STOCK_LOW, {
        productId: stock.productId,
        quantity: quantityAfter,
        threshold: stock.lowStockThreshold,
      }),
    );
  }
}
