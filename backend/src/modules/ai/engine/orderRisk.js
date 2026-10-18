import { AI_LEVEL, ORDER_STATUS } from '@smart-ecommerce/shared';
import { mean, standardDeviation } from './forecasting.js';

/*
 * Score de risque d'une commande (fraude, annulation probable, erreur de saisie).
 * Détection d'anomalies explicable : chaque facteur inhabituel ajoute des points et une raison
 * lisible. L'administrateur garde la décision : le score sert à vérifier avant de confirmer.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Statistiques des montants (en log) sur les commandes non annulées. */
export function buildAmountStats(orders) {
  const amounts = orders
    .filter((order) => order.status !== ORDER_STATUS.CANCELLED)
    .map((order) => Math.log1p(order.totalAmount));
  return { mean: mean(amounts), std: standardDeviation(amounts) || 1 };
}

/**
 * @param {object} order commande analysée (avec ses lignes)
 * @param {{ customer?: { createdAt: Date }, history: object[], amountStats: { mean: number, std: number } }} context
 *   history = toutes les commandes du même client
 */
export function scoreOrder(order, { customer, history, amountStats }) {
  const orderTime = new Date(order.createdAt).getTime();
  const previous = history.filter(
    (other) => other.id !== order.id && new Date(other.createdAt).getTime() < orderTime,
  );
  const previousValid = previous.filter((other) => other.status !== ORDER_STATUS.CANCELLED);
  const reasons = [];
  let score = 0;
  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  if (previousValid.length === 0) add(15, 'Première commande de ce client');

  if (customer) {
    const accountAgeDays = (orderTime - new Date(customer.createdAt).getTime()) / DAY_MS;
    if (accountAgeDays < 3) add(15, 'Compte créé il y a moins de 3 jours');
  }

  const zScore = (Math.log1p(order.totalAmount) - amountStats.mean) / amountStats.std;
  if (zScore >= 2) add(25, 'Montant très supérieur aux commandes habituelles de la boutique');
  else if (zScore >= 1.3) add(12, 'Montant élevé par rapport aux commandes habituelles');

  if (previousValid.length >= 2) {
    const customerAverage = mean(previousValid.map((other) => other.totalAmount));
    if (order.totalAmount > 3 * customerAverage) {
      add(15, 'Montant inhabituel pour ce client (plus de 3 fois sa moyenne)');
    }
  }

  const bulkItem = order.items.find((item) => item.quantity >= 4);
  if (bulkItem) add(15, `Quantité inhabituelle : ${bulkItem.quantity} × ${bulkItem.productName}`);
  if (order.items.length >= 5)
    add(8, `Panier très varié (${order.items.length} produits différents)`);

  const cancelled = previous.filter((other) => other.status === ORDER_STATUS.CANCELLED).length;
  if (cancelled >= 2 && cancelled / previous.length >= 0.3) {
    add(20, `Le client a déjà annulé ${cancelled} commandes`);
  }

  const knownCities = new Set(previousValid.map((other) => other.city).filter(Boolean));
  if (order.city && knownCities.size > 0 && !knownCities.has(order.city)) {
    add(10, `Nouvelle ville de livraison (${order.city})`);
  }

  const burst = history.filter(
    (other) => Math.abs(new Date(other.createdAt).getTime() - orderTime) < DAY_MS,
  ).length;
  if (burst >= 3) add(15, `${burst} commandes du même client en 24 h`);

  score = Math.min(100, score);
  const level = score >= 50 ? AI_LEVEL.HIGH : score >= 25 ? AI_LEVEL.MEDIUM : AI_LEVEL.LOW;
  return {
    score,
    level,
    reasons: reasons.length > 0 ? reasons : ['Commande conforme aux habitudes'],
  };
}
