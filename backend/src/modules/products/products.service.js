import { getStockStatus, PRODUCT_SORT } from '@smart-ecommerce/shared';
import { literal, Op } from 'sequelize';
import { NotFoundError, ValidationError } from '../../core/errors/index.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { likeContains } from '../../core/utils/query.js';
import { uniqueSlug } from '../../core/utils/slug.js';
import { models, sequelize } from '../../database/index.js';
import * as stockModule from '../stock/index.js';

const { Product, Category, Stock } = models;

// Catégorie + quantité en stock (lecture seule de la table du module Stock pour l'affichage)
const categoryInclude = { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] };
const stockInclude = { model: Stock, as: 'stock', attributes: ['quantity', 'lowStockThreshold'] };

const SORT_ORDERS = {
  [PRODUCT_SORT.NEWEST]: [['createdAt', 'DESC']],
  [PRODUCT_SORT.PRICE_ASC]: [['price', 'ASC']],
  [PRODUCT_SORT.PRICE_DESC]: [['price', 'DESC']],
  [PRODUCT_SORT.POPULARITY]: [['salesCount', 'DESC']],
  [PRODUCT_SORT.RATING]: [
    ['ratingAverage', 'DESC'],
    ['reviewCount', 'DESC'],
  ],
};

export function toProductResponse(product) {
  const quantity = product.stock?.quantity ?? 0;
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: product.price,
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls?.length
      ? product.imageUrls
      : product.imageUrl
        ? [product.imageUrl]
        : [],
    sizes: product.sizes ?? [],
    colors: product.colors ?? [],
    isActive: product.isActive,
    category: product.category && {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    },
    salesCount: product.salesCount,
    rating: { average: Number(product.ratingAverage), count: product.reviewCount },
    stock: {
      availableQuantity: quantity,
      status: getStockStatus(quantity, product.stock?.lowStockThreshold),
      inStock: quantity > 0,
    },
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

/* ─────────────────────────── Catalogue (public) ─────────────────────────── */

export async function listProducts(query, { canSeeInactive = false } = {}) {
  const { page, limit, search, categoryId, minPrice, maxPrice, inStock, sort, includeInactive } =
    query;

  const where = {};
  if (!(canSeeInactive && includeInactive)) where.isActive = true;
  if (categoryId) where.categoryId = categoryId;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {
      ...(minPrice !== undefined && { [Op.gte]: minPrice }),
      ...(maxPrice !== undefined && { [Op.lte]: maxPrice }),
    };
  }
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: likeContains(search) } },
      { description: { [Op.like]: likeContains(search) } },
    ];
  }

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: [
      categoryInclude,
      inStock
        ? { ...stockInclude, where: { quantity: { [Op.gt]: 0 } }, required: true }
        : stockInclude,
    ],
    order: [...SORT_ORDERS[sort], ['id', 'DESC']],
    ...toSequelizePagination({ page, limit }),
    distinct: true,
  });

  return { items: rows.map(toProductResponse), meta: buildPaginationMeta({ page, limit }, count) };
}

export async function getProduct(id, { canSeeInactive = false } = {}) {
  const product = await Product.findByPk(id, { include: [categoryInclude, stockInclude] });
  if (!product || (!product.isActive && !canSeeInactive)) {
    throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
  }
  return toProductResponse(product);
}

/* ─────────────────────────── Gestion (products:manage) ─────────────────────────── */

export async function createProduct(data, { userId }) {
  const { initialStock, ...fields } = data;
  const product = await sequelize.transaction(async (transaction) => {
    await assertCategoryExists(fields.categoryId, transaction);
    const slug = await uniqueSlug(Product, fields.name, { transaction });
    const created = await Product.create({ ...fields, slug }, { transaction });
    // Le stock appartient au module Stock : on passe par son API publique.
    await stockModule.createStockForProduct(created.id, {
      quantity: initialStock,
      transaction,
      userId,
    });
    return created;
  });
  return getProduct(product.id, { canSeeInactive: true });
}

export async function updateProduct(id, data) {
  await sequelize.transaction(async (transaction) => {
    const product = await Product.findByPk(id, { transaction });
    if (!product) throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
    await assertCategoryExists(data.categoryId, transaction);
    const slug =
      data.name === product.name
        ? product.slug
        : await uniqueSlug(Product, data.name, { excludeId: id, transaction });
    await product.update({ ...data, slug }, { transaction });
  });
  return getProduct(id, { canSeeInactive: true });
}

/** « Suppression » = désactivation : le produit reste dans l'historique des commandes. */
export async function deactivateProduct(id) {
  const product = await Product.findByPk(id);
  if (!product) throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
  await product.update({ isActive: false });
}

async function assertCategoryExists(categoryId, transaction) {
  if ((await Category.count({ where: { id: categoryId }, transaction })) === 0) {
    throw new ValidationError([
      { field: 'categoryId', location: 'body', message: "Cette catégorie n'existe pas" },
    ]);
  }
}

/* ─────────────── API publique (utilisée par les autres modules) ─────────────── */

/**
 * Infos nécessaires au panier et aux commandes : Map productId → résumé.
 * @returns {Promise<Map<number, { id, name, price, imageUrl, isActive, availableQuantity }>>}
 */
export async function getProductSummaries(productIds, { transaction } = {}) {
  const products = await Product.findAll({
    where: { id: productIds },
    include: [stockInclude],
    transaction,
  });
  return new Map(
    products.map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        availableQuantity: product.stock?.quantity ?? 0,
        sizes: product.sizes ?? [],
        colors: product.colors ?? [],
      },
    ]),
  );
}

/** Vérifie qu'un produit existe (et est actif, par défaut). */
export async function assertProductExists(productId, { activeOnly = true } = {}) {
  const where = { id: productId, ...(activeOnly && { isActive: true }) };
  if ((await Product.count({ where })) === 0) {
    throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');
  }
}

/** Popularité : exemplaires vendus, mise à jour à la confirmation / l'annulation d'une commande. */
export async function incrementSalesCount(items, { transaction }) {
  for (const { productId, quantity } of items) {
    await Product.increment('salesCount', { by: quantity, where: { id: productId }, transaction });
  }
}

export async function decrementSalesCount(items, { transaction }) {
  for (const { productId, quantity } of items) {
    await Product.update(
      {
        // Jamais en dessous de 0 (colonne non signée)
        salesCount: literal(
          `CASE WHEN sales_count >= ${Number(quantity)} THEN sales_count - ${Number(quantity)} ELSE 0 END`,
        ),
      },
      { where: { id: productId }, transaction },
    );
  }
}

/** Résumé des avis, calculé par le module Avis. */
export async function updateProductRating(productId, { average, count }, { transaction } = {}) {
  await Product.update(
    { ratingAverage: average, reviewCount: count },
    { where: { id: productId }, transaction },
  );
}
