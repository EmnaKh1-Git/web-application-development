import { hasPermission, PERMISSIONS } from '@smart-ecommerce/shared';
import { col, fn } from 'sequelize';
import { ConflictError, ForbiddenError, NotFoundError } from '../../core/errors/index.js';
import { EVENTS, publish } from '../../core/events/index.js';
import { assertOwnershipOrPermission } from '../../core/security/ownership.js';
import { buildPaginationMeta, toSequelizePagination } from '../../core/utils/pagination.js';
import { models, sequelize } from '../../database/index.js';
import * as ordersModule from '../orders/index.js';
import * as productsModule from '../products/index.js';

/* Avis sur les produits : réservés aux clients qui ont REÇU le produit. */

const { Review, User, Product } = models;

const authorInclude = { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName'] };
const productInclude = { model: Product, as: 'product', attributes: ['id', 'name', 'imageUrl'] };

export function toReviewResponse(review) {
  return {
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    comment: review.comment,
    // Nom affiché publiquement : prénom + initiale du nom (pas d'email ni de nom complet)
    author: review.author && {
      id: review.author.id,
      name: `${review.author.firstName} ${review.author.lastName.charAt(0)}.`,
    },
    product: review.product && {
      id: review.product.id,
      name: review.product.name,
      imageUrl: review.product.imageUrl,
    },
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

/** Avis d'un produit + résumé des notes + ce que l'utilisateur connecté peut faire. */
export async function listProductReviews(productId, { page, limit }, viewer) {
  await productsModule.assertProductExists(productId);
  const [{ rows, count }, summary, viewerState] = await Promise.all([
    Review.findAndCountAll({
      where: { productId },
      include: [authorInclude],
      order: [
        ['createdAt', 'DESC'],
        ['id', 'DESC'],
      ],
      ...toSequelizePagination({ page, limit }),
    }),
    getRatingSummary(productId),
    getViewerState(productId, viewer),
  ]);
  return {
    data: { summary, viewer: viewerState, reviews: rows.map(toReviewResponse) },
    meta: buildPaginationMeta({ page, limit }, count),
  };
}

/** Avis d'un produit (note et commentaire uniquement) pour le résumé du module IA. */
export async function getReviewsForAnalysis(productId) {
  const reviews = await Review.findAll({
    where: { productId },
    attributes: ['id', 'rating', 'comment', 'createdAt'],
    order: [
      ['createdAt', 'DESC'],
      ['id', 'DESC'],
    ],
  });
  return reviews.map((review) => review.get({ plain: true }));
}

export async function listMyReviews(userId) {
  const reviews = await Review.findAll({
    where: { userId },
    include: [authorInclude, productInclude],
    order: [['createdAt', 'DESC']],
  });
  return reviews.map(toReviewResponse);
}

export async function createReview(user, productId, { rating, comment }) {
  await productsModule.assertProductExists(productId);
  if (!(await ordersModule.hasUserPurchasedProduct(user.id, productId))) {
    throw new ForbiddenError(
      'Vous pourrez donner votre avis après avoir reçu ce produit',
      'PURCHASE_REQUIRED',
    );
  }
  if ((await Review.count({ where: { userId: user.id, productId } })) > 0) {
    throw new ConflictError(
      'Vous avez déjà donné votre avis sur ce produit',
      'REVIEW_ALREADY_EXISTS',
    );
  }

  const review = await sequelize.transaction(async (transaction) => {
    const created = await Review.create(
      { userId: user.id, productId, rating, comment },
      { transaction },
    );
    await refreshProductRating(productId, transaction);
    return created;
  });
  publish(EVENTS.REVIEW_CHANGED, { productId, reviewId: review.id });
  return getReview(review.id);
}

/** Modification : uniquement par l'auteur. */
export async function updateReview(user, reviewId, { rating, comment }) {
  const review = await findReviewOrFail(reviewId);
  assertOwnershipOrPermission(user, review.userId);
  await sequelize.transaction(async (transaction) => {
    await review.update({ rating, comment }, { transaction });
    await refreshProductRating(review.productId, transaction);
  });
  publish(EVENTS.REVIEW_CHANGED, { productId: review.productId, reviewId: review.id });
  return getReview(review.id);
}

/** Suppression : par l'auteur ou un modérateur (reviews:moderate). */
export async function deleteReview(user, reviewId) {
  const review = await findReviewOrFail(reviewId);
  assertOwnershipOrPermission(user, review.userId, PERMISSIONS.REVIEWS_MODERATE);
  await sequelize.transaction(async (transaction) => {
    await review.destroy({ transaction });
    await refreshProductRating(review.productId, transaction);
  });
  publish(EVENTS.REVIEW_CHANGED, { productId: review.productId, reviewId: review.id });
}

/* ─────────────────────────── Fonctions internes ─────────────────────────── */

async function getReview(reviewId) {
  return toReviewResponse(
    await Review.findByPk(reviewId, { include: [authorInclude, productInclude] }),
  );
}

async function findReviewOrFail(reviewId) {
  const review = await Review.findByPk(reviewId);
  if (!review) throw new NotFoundError('Avis introuvable', 'REVIEW_NOT_FOUND');
  return review;
}

async function getRatingSummary(productId, transaction) {
  const rows = await Review.findAll({
    where: { productId },
    attributes: ['rating', [fn('COUNT', col('id')), 'count']],
    group: ['rating'],
    raw: true,
    transaction,
  });
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const row of rows) distribution[row.rating] = Number(row.count);
  const count = Object.values(distribution).reduce((total, value) => total + value, 0);
  const sum = Object.entries(distribution).reduce(
    (total, [rating, value]) => total + Number(rating) * value,
    0,
  );
  return { average: count === 0 ? 0 : Math.round((sum / count) * 100) / 100, count, distribution };
}

/** Recalcule la note moyenne et la transmet au module Produits (affichage et tri du catalogue). */
async function refreshProductRating(productId, transaction) {
  const { average, count } = await getRatingSummary(productId, transaction);
  await productsModule.updateProductRating(productId, { average, count }, { transaction });
}

async function getViewerState(productId, viewer) {
  if (!viewer || !hasPermission(viewer.role, PERMISSIONS.REVIEWS_WRITE)) {
    return { canReview: false, myReview: null };
  }
  const myReview = await Review.findOne({
    where: { productId, userId: viewer.id },
    include: [authorInclude],
  });
  const canReview = !myReview && (await ordersModule.hasUserPurchasedProduct(viewer.id, productId));
  return { canReview, myReview: myReview ? toReviewResponse(myReview) : null };
}
