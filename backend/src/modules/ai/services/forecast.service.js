import { ORDER_STATUS, STOCK_RISK } from '@smart-ecommerce/shared';
import { NotFoundError } from '../../../core/errors/index.js';
import { cached } from '../ai.cache.js';
import { getCatalog, getOrders, getStockLevels } from '../ai.data.js';
import {
  backtest,
  buildDailySeries,
  DAY_MS,
  dayIndex,
  forecastDailyRate,
  round,
  standardDeviation,
  stockAdvice,
  wape,
  weekdayProfile,
} from '../engine/forecasting.js';

const HISTORY_DAYS = 180;
const RISK_ORDER = [STOCK_RISK.CRITICAL, STOCK_RISK.WARNING, STOCK_RISK.OK, STOCK_RISK.NO_DEMAND];

/** Ventes (commandes non annulées) : Map productId → [{ date, quantity }]. */
function salesByProduct(orders) {
  const sales = new Map();
  for (const order of orders) {
    if (order.status === ORDER_STATUS.CANCELLED) continue;
    for (const item of order.items) {
      const list = sales.get(item.productId) ?? [];
      list.push({ date: order.createdAt, quantity: item.quantity });
      sales.set(item.productId, list);
    }
  }
  return sales;
}

/** Modèle de demande de chaque produit (recalculé après chaque commande, sinon toutes les 5 min). */
export function getDemandModel() {
  return cached('orders:model:forecast', 5 * 60_000, async () => {
    const [catalog, orders] = await Promise.all([getCatalog(), getOrders()]);
    const today = dayIndex(Date.now());
    const startDay = today - HISTORY_DAYS;
    const sales = salesByProduct(orders);
    const allSales = [...sales.values()].flat().filter(({ date }) => dayIndex(date) >= startDay);

    const products = new Map();
    for (const product of catalog) {
      const firstDay = Math.max(startDay, dayIndex(product.createdAt));
      const series = buildDailySeries(sales.get(product.id) ?? [], firstDay, today);
      const forecast = forecastDailyRate(series);
      products.set(product.id, {
        product,
        series,
        firstDay,
        ...forecast,
        sigma: standardDeviation(series),
        soldLast30Days: series.slice(-30).reduce((total, value) => total + value, 0),
      });
    }
    return { products, weekday: weekdayProfile(allSales), today };
  });
}

function toForecastItem(entry, stock) {
  const quantity = stock?.quantity ?? 0;
  const advice = stockAdvice({ quantity, rate: entry.rate, sigma: entry.sigma });
  const { product } = entry;
  return {
    productId: product.id,
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
    },
    quantity,
    lowStockThreshold: stock?.lowStockThreshold ?? null,
    dailyDemand: round(entry.rate, 2),
    soldLast30Days: entry.soldLast30Days,
    demandType: entry.type,
    method: entry.method,
    historyDays: entry.series.length,
    stockoutDate:
      advice.daysOfCover === null || advice.risk === STOCK_RISK.NO_DEMAND
        ? null
        : new Date(Date.now() + advice.daysOfCover * DAY_MS).toISOString().slice(0, 10),
    ...advice,
    // Stock « dormant » : couverture de plus de 4 mois (ou aucune vente) avec du stock
    isDormant: quantity > 5 && (advice.daysOfCover === null || advice.daysOfCover > 120),
  };
}

/** Prévisions de tous les produits actifs, les plus urgents en premier. */
export async function getStockForecast() {
  const [model, stocks] = await Promise.all([getDemandModel(), getStockLevels()]);
  const items = [...model.products.values()]
    .map((entry) => toForecastItem(entry, stocks.get(entry.product.id)))
    .sort(
      (a, b) =>
        RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) ||
        (a.daysOfCover ?? Infinity) - (b.daysOfCover ?? Infinity),
    );
  const count = (predicate) => items.filter(predicate).length;
  return {
    items,
    summary: {
      critical: count((item) => item.risk === STOCK_RISK.CRITICAL),
      warning: count((item) => item.risk === STOCK_RISK.WARNING),
      toReorder: count((item) => item.suggestedQuantity > 0),
      dormant: count((item) => item.isDormant),
      dormantValue: round(
        items
          .filter((item) => item.isDormant)
          .reduce((total, item) => total + item.quantity * item.product.price, 0),
      ),
    },
  };
}

/**
 * Détail d'un produit : ventes des 60 derniers jours, prévision jour par jour (avec intervalle
 * à 80 %) sur `horizon` jours et projection du stock jusqu'à la rupture.
 */
export async function getProductForecast(productId, { horizon = 30 } = {}) {
  const [model, stocks] = await Promise.all([getDemandModel(), getStockLevels()]);
  const entry = model.products.get(productId);
  if (!entry) throw new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND');

  const item = toForecastItem(entry, stocks.get(productId));
  const toDate = (day) => new Date(day * DAY_MS).toISOString().slice(0, 10);
  const historyStart = Math.max(entry.firstDay, model.today - 59);
  const history = entry.series
    .slice(historyStart - entry.firstDay)
    .map((quantity, index) => ({ date: toDate(historyStart + index), quantity }));

  let projected = item.quantity;
  const forecast = [];
  for (let offset = 1; offset <= horizon; offset += 1) {
    const day = model.today + offset;
    const expected = entry.rate * model.weekday[new Date(day * DAY_MS).getUTCDay()];
    projected = Math.max(0, projected - expected);
    forecast.push({
      date: toDate(day),
      expected: round(expected, 2),
      low: round(Math.max(0, expected - 1.28 * entry.sigma), 2),
      high: round(expected + 1.28 * entry.sigma, 2),
      projectedStock: round(projected, 1),
    });
  }
  return { ...item, adi: entry.adi, cv2: entry.cv2, history, forecast };
}

/** Réutilisé par les recommandations : favoriser le stock dormant, ménager le stock critique. */
export async function getStockBoosts() {
  const { items } = await getStockForecast();
  return new Map(
    items.map((item) => [
      item.productId,
      item.isDormant ? 1.15 : item.risk === STOCK_RISK.CRITICAL ? 0.9 : 1,
    ]),
  );
}

/** Backtest sur les 28 derniers jours : notre méthode contre la moyenne naïve. */
export async function evaluateForecasts() {
  const model = await getDemandModel();
  const pairs = [...model.products.values()]
    .map((entry) => backtest(entry.series, 28))
    .filter(Boolean)
    .filter((pair) => pair.actual + pair.predicted + pair.naive > 0);
  const ours = wape(pairs);
  const naive = wape(pairs, 'naive');
  return {
    products: pairs.length,
    horizonDays: 28,
    wape: ours,
    naiveWape: naive,
    improvement: ours !== null && naive ? round((naive - ours) / naive, 3) : null,
  };
}
