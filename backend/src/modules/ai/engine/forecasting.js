import { STOCK_RISK } from '@smart-ecommerce/shared';

/*
 * Prévision de la demande par produit et conseils de réapprovisionnement.
 *
 * 1. Les ventes sont agrégées par jour (série temporelle).
 * 2. La demande est classée selon Syntetos & Boylan (régulière, irrégulière, intermittente,
 *    sporadique) à partir de l'intervalle moyen entre deux ventes (ADI) et de la variabilité (CV²).
 * 3. Méthode adaptée : lissage exponentiel simple pour une demande régulière,
 *    méthode de Croston corrigée (SBA) pour une demande intermittente, très fréquente en
 *    e-commerce (beaucoup de jours sans vente).
 * 4. Un profil hebdomadaire (samedi plus fort que mardi...) module la prévision jour par jour.
 * 5. Stock de sécurité et point de commande : calculs classiques de gestion des stocks.
 */

export const DAY_MS = 86_400_000;
const ADI_CUTOFF = 1.32;
const CV2_CUTOFF = 0.49;

/** Jour (minuit UTC) d'une date, en nombre de jours depuis 1970. */
export function dayIndex(date) {
  return Math.floor(new Date(date).getTime() / DAY_MS);
}

/**
 * Série des quantités vendues par jour, du jour `startDay` au jour `endDay` inclus.
 * @param {{ date: Date, quantity: number }[]} sales
 */
export function buildDailySeries(sales, startDay, endDay) {
  const series = new Array(Math.max(0, endDay - startDay + 1)).fill(0);
  for (const { date, quantity } of sales) {
    const index = dayIndex(date) - startDay;
    if (index >= 0 && index < series.length) series[index] += quantity;
  }
  return series;
}

export function mean(values) {
  return values.length === 0
    ? 0
    : values.reduce((total, value) => total + value, 0) / values.length;
}

export function standardDeviation(values) {
  if (values.length < 2) return 0;
  const average = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - average) ** 2)));
}

/** Type de demande (Syntetos & Boylan). */
export function classifyDemand(series) {
  const demands = series.filter((value) => value > 0);
  if (demands.length === 0) return { type: 'none', adi: null, cv2: null };
  const adi = series.length / demands.length;
  const cv = mean(demands) === 0 ? 0 : standardDeviation(demands) / mean(demands);
  const cv2 = cv ** 2;
  const type =
    adi < ADI_CUTOFF
      ? cv2 < CV2_CUTOFF
        ? 'smooth'
        : 'erratic'
      : cv2 < CV2_CUTOFF
        ? 'intermittent'
        : 'lumpy';
  return { type, adi: round(adi), cv2: round(cv2) };
}

/** Lissage exponentiel simple : niveau de la demande journalière. */
export function exponentialSmoothing(series, alpha = 0.2) {
  if (series.length === 0) return 0;
  // Initialisation sur la moyenne des premiers jours (plus stable que la première valeur)
  let level = mean(series.slice(0, Math.min(7, series.length)));
  for (const value of series) level = alpha * value + (1 - alpha) * level;
  return level;
}

/**
 * Méthode de Croston corrigée par Syntetos-Boylan (SBA) :
 * on lisse séparément la taille des ventes et l'intervalle entre deux ventes.
 */
export function crostonSBA(series, alpha = 0.15) {
  let size = null;
  let interval = null;
  let periodsSinceDemand = 1;
  for (const value of series) {
    if (value > 0) {
      size = size === null ? value : alpha * value + (1 - alpha) * size;
      interval =
        interval === null
          ? periodsSinceDemand
          : alpha * periodsSinceDemand + (1 - alpha) * interval;
      periodsSinceDemand = 1;
    } else {
      periodsSinceDemand += 1;
    }
  }
  if (size === null) return 0;
  return (1 - alpha / 2) * (size / interval);
}

/** Demande journalière prévue (unités/jour) avec la méthode adaptée au type de demande. */
export function forecastDailyRate(series) {
  const demand = classifyDemand(series);
  if (demand.type === 'none') return { rate: 0, method: 'none', ...demand };
  if (demand.type === 'smooth' || demand.type === 'erratic') {
    return { rate: exponentialSmoothing(series), method: 'ses', ...demand };
  }
  return { rate: crostonSBA(series), method: 'croston-sba', ...demand };
}

/**
 * Profil hebdomadaire : coefficient de chaque jour (0 = dimanche) par rapport à la moyenne,
 * calculé sur l'ensemble des ventes (plus de données = profil plus fiable).
 */
export function weekdayProfile(sales) {
  const totals = new Array(7).fill(0);
  for (const { date, quantity } of sales) totals[new Date(date).getUTCDay()] += quantity;
  const overall = totals.reduce((total, value) => total + value, 0) / 7;
  if (overall === 0) return new Array(7).fill(1);
  // Lissage vers 1 pour éviter des coefficients extrêmes avec peu de données
  return totals.map((total) => round(0.7 * (total / overall) + 0.3, 3));
}

/**
 * Conseils de gestion à partir de la demande prévue.
 * - point de commande = demande pendant le délai de livraison + stock de sécurité
 * - quantité conseillée = de quoi tenir jusqu'à la prochaine revue (délai + période de revue)
 */
export function stockAdvice({
  quantity,
  rate,
  sigma,
  leadTimeDays = 5,
  reviewDays = 14,
  serviceZ = 1.65, // niveau de service de 95 %
}) {
  const safetyStock = serviceZ * sigma * Math.sqrt(leadTimeDays);
  const reorderPoint = Math.ceil(rate * leadTimeDays + safetyStock);
  const targetLevel = Math.ceil(rate * (leadTimeDays + reviewDays) + safetyStock);
  const daysOfCover = rate > 0 ? quantity / rate : null;

  let risk;
  if (rate <= 0.01) risk = STOCK_RISK.NO_DEMAND;
  else if (quantity === 0 || daysOfCover <= leadTimeDays + 2) risk = STOCK_RISK.CRITICAL;
  else if (daysOfCover <= leadTimeDays + reviewDays) risk = STOCK_RISK.WARNING;
  else risk = STOCK_RISK.OK;

  const needsRestock = rate > 0.01 && quantity <= Math.max(reorderPoint, 0);
  return {
    risk,
    daysOfCover: daysOfCover === null ? null : round(daysOfCover, 1),
    safetyStock: Math.ceil(safetyStock),
    reorderPoint,
    suggestedQuantity:
      needsRestock || risk === STOCK_RISK.CRITICAL ? Math.max(0, targetLevel - quantity) : 0,
    suggestedThreshold: Math.max(1, reorderPoint),
  };
}

/**
 * Évaluation hors échantillon (backtest) : le modèle apprend sur les jours précédant les
 * `horizon` derniers jours, puis on compare la quantité prévue à la quantité réellement vendue.
 * Référence « naïve » : moyenne des 28 derniers jours d'apprentissage.
 */
export function backtest(series, horizon = 28) {
  if (series.length <= horizon + 14) return null;
  const train = series.slice(0, -horizon);
  const actual = series.slice(-horizon).reduce((total, value) => total + value, 0);
  const predicted = forecastDailyRate(train).rate * horizon;
  const naive = mean(train.slice(-28)) * horizon;
  return { actual, predicted, naive };
}

/** Erreur absolue pondérée en pourcentage (WAPE) : Σ|prévu − réel| / Σ réel. */
export function wape(pairs, key = 'predicted') {
  const totalActual = pairs.reduce((total, pair) => total + pair.actual, 0);
  if (totalActual === 0) return null;
  const totalError = pairs.reduce((total, pair) => total + Math.abs(pair[key] - pair.actual), 0);
  return round(totalError / totalActual, 3);
}

export function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
