import { CUSTOMER_SEGMENT, ORDER_STATUS } from '@smart-ecommerce/shared';

/*
 * Segmentation des clients par la méthode RFM, standard du marketing :
 * - Récence  : jours depuis la dernière commande (note par paliers : 7, 14, 30, 60 jours) ;
 * - Fréquence : nombre de commandes ;
 * - Montant  : total dépensé.
 * Fréquence et montant reçoivent une note de 1 à 5 par quintiles (comparaison avec les autres clients),
 * puis des règles transforment les trois notes en segment actionnable.
 * En plus, une baisse nette du rythme d'achat (60 derniers jours comparés aux mois précédents)
 * signale un client fidèle en train de partir, même s'il a commandé récemment.
 */

const DAY_MS = 86_400_000;
const RECENT_DAYS = 60;

/** Note de récence de 1 à 5 : paliers absolus, plus parlants qu'un classement entre clients. */
function recencyScore(days) {
  if (days <= 7) return 5;
  if (days <= 14) return 4;
  if (days <= 30) return 3;
  if (days <= 60) return 2;
  return 1;
}

/** Note de 1 à 5 selon la position de la valeur parmi toutes les valeurs (quintiles). */
function quintileScore(value, sortedValues) {
  if (sortedValues.length <= 1) return 3;
  const below = sortedValues.filter((other) => other < value).length;
  const equal = sortedValues.filter((other) => other === value).length;
  const rank = (below + (equal - 1) / 2) / (sortedValues.length - 1); // 0 à 1
  return 1 + Math.round(rank * 4);
}

/**
 * @param {{ id: number, createdAt: Date }[]} customers
 * @param {{ userId: number, status: string, totalAmount: number, createdAt: Date }[]} orders
 */
export function segmentCustomers(customers, orders, { now = Date.now() } = {}) {
  const stats = new Map(
    customers.map((customer) => [
      customer.id,
      { recencyDays: null, frequency: 0, monetary: 0, recentCount: 0, firstOrderDays: 0 },
    ]),
  );
  for (const order of orders) {
    const entry = stats.get(order.userId);
    if (!entry || order.status === ORDER_STATUS.CANCELLED) continue;
    entry.frequency += 1;
    entry.monetary += order.totalAmount;
    const days = (now - new Date(order.createdAt).getTime()) / DAY_MS;
    entry.recencyDays = entry.recencyDays === null ? days : Math.min(entry.recencyDays, days);
    entry.firstOrderDays = Math.max(entry.firstOrderDays, days);
    if (days <= RECENT_DAYS) entry.recentCount += 1;
  }

  const buyers = [...stats.values()].filter((entry) => entry.frequency > 0);
  const frequencies = buyers.map((entry) => entry.frequency).sort((a, b) => a - b);
  const amounts = buyers.map((entry) => entry.monetary).sort((a, b) => a - b);

  return new Map(
    customers.map((customer) => {
      const entry = stats.get(customer.id);
      const accountAgeDays = (now - new Date(customer.createdAt).getTime()) / DAY_MS;
      if (entry.frequency === 0) {
        return [
          customer.id,
          { segment: CUSTOMER_SEGMENT.NO_ORDER, ...rounded(entry), scores: null },
        ];
      }
      const r = recencyScore(entry.recencyDays);
      const f = quintileScore(entry.frequency, frequencies);
      const m = quintileScore(entry.monetary, amounts);

      const trend = activityTrend(entry);
      let segment;
      if (entry.frequency <= 2 && accountAgeDays <= 45) segment = CUSTOMER_SEGMENT.NEW;
      else if (trend !== null && trend <= -0.6 && entry.frequency >= 6)
        segment = CUSTOMER_SEGMENT.AT_RISK;
      else if (r >= 4 && f >= 4 && m >= 4) segment = CUSTOMER_SEGMENT.CHAMPION;
      else if (r <= 2 && f >= 3) segment = CUSTOMER_SEGMENT.AT_RISK;
      else if (r <= 2) segment = CUSTOMER_SEGMENT.HIBERNATING;
      else if (m === 5) segment = CUSTOMER_SEGMENT.BIG_SPENDER;
      else if (f >= 4) segment = CUSTOMER_SEGMENT.LOYAL;
      else segment = CUSTOMER_SEGMENT.PROMISING;

      return [
        customer.id,
        { segment, ...rounded(entry), activityTrend: trend, scores: { r, f, m } },
      ];
    }),
  );
}

/**
 * Évolution du rythme d'achat : commandes par mois sur les 60 derniers jours comparées aux mois
 * précédents (-0,8 = baisse de 80 %). null si l'historique est trop court pour conclure.
 */
function activityTrend({ frequency, recentCount, firstOrderDays }) {
  const previousMonths = (firstOrderDays - RECENT_DAYS) / 30;
  if (previousMonths < 2) return null;
  const previousRate = (frequency - recentCount) / previousMonths;
  if (previousRate < 1) return null;
  const recentRate = recentCount / (RECENT_DAYS / 30);
  return Math.round(((recentRate - previousRate) / previousRate) * 100) / 100;
}

function rounded({ recencyDays, frequency, monetary }) {
  return {
    recencyDays: recencyDays === null ? null : Math.floor(recencyDays),
    frequency,
    monetary: Math.round(monetary * 100) / 100,
  };
}
