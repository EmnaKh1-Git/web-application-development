import { STOCK_STATUS } from '@smart-ecommerce/shared';
import { tokenize } from './text.js';

/*
 * Recommandations « hybrides » :
 * - filtrage collaboratif article-article : produits souvent achetés ensemble (co-achats) ;
 * - similarité de contenu : TF-IDF sur le nom, la catégorie et la description ;
 * - popularité : ventes et note moyenne bayésienne (pour les nouveaux visiteurs).
 * Les recommandations tiennent compte du stock : un produit en rupture n'est jamais proposé,
 * un produit presque épuisé est moins mis en avant, un produit qui dort en stock l'est davantage.
 */

const WEIGHTS = { copurchase: 0.55, content: 0.3, category: 0.15 };

/**
 * Construit le modèle à partir du catalogue et des commandes (hors commandes annulées).
 * @param {{ products: object[], orders: { userId: number, items: { productId: number }[] }[], stockBoosts?: Map<number, number> }} data
 */
export function buildRecommender({ products, orders, stockBoosts = new Map() }) {
  const productsById = new Map(products.map((product) => [product.id, product]));

  // TF-IDF : le nom compte double, la catégorie et la description une fois
  const documents = new Map(
    products.map((product) => [
      product.id,
      [
        ...tokenize(product.name),
        ...tokenize(product.name),
        ...tokenize(product.category?.name),
        ...tokenize(product.description),
      ],
    ]),
  );
  const documentFrequency = new Map();
  for (const tokens of documents.values()) {
    for (const token of new Set(tokens)) {
      documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
    }
  }
  const vectors = new Map();
  for (const [productId, tokens] of documents) {
    const counts = new Map();
    for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
    const vector = new Map();
    let norm = 0;
    for (const [token, count] of counts) {
      const weight = count * Math.log(1 + products.length / documentFrequency.get(token));
      vector.set(token, weight);
      norm += weight ** 2;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [token, weight] of vector) vector.set(token, weight / norm);
    vectors.set(productId, vector);
  }

  // Co-achats : nombre de commandes contenant les deux produits
  const orderCounts = new Map();
  const copurchases = new Map();
  for (const order of orders) {
    const ids = [...new Set(order.items.map((item) => item.productId))];
    for (const id of ids) orderCounts.set(id, (orderCounts.get(id) ?? 0) + 1);
    for (const a of ids) {
      for (const b of ids) {
        if (a === b) continue;
        const row = copurchases.get(a) ?? new Map();
        row.set(b, (row.get(b) ?? 0) + 1);
        copurchases.set(a, row);
      }
    }
  }

  // Popularité : ventes (log) + note bayésienne (tirée vers la moyenne quand il y a peu d'avis)
  const rated = products.filter((product) => product.rating.count > 0);
  const globalAverage =
    rated.reduce((total, product) => total + product.rating.average, 0) / (rated.length || 1) || 4;
  const popularity = new Map(
    products.map((product) => {
      const { average, count } = product.rating;
      const bayesian = (count * average + 3 * globalAverage) / (count + 3);
      return [product.id, Math.log1p(product.salesCount ?? 0) + bayesian];
    }),
  );

  return { productsById, vectors, orderCounts, copurchases, popularity, stockBoosts };
}

function cosine(a, b) {
  if (!a || !b) return 0;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  let total = 0;
  for (const [token, weight] of small) total += weight * (large.get(token) ?? 0);
  return total;
}

/** Ajustement selon le stock : jamais en rupture, moins si stock faible, plus si stock dormant. */
function stockFactor(model, product) {
  if (!product.isActive || product.stock.status === STOCK_STATUS.OUT) return 0;
  const lowFactor = product.stock.status === STOCK_STATUS.LOW ? 0.85 : 1;
  return lowFactor * (model.stockBoosts.get(product.id) ?? 1);
}

/** Score d'affinité entre deux produits et la raison principale. */
function affinity(model, source, candidate) {
  const together = model.copurchases.get(source.id)?.get(candidate.id) ?? 0;
  const copurchase =
    together === 0
      ? 0
      : together /
        Math.sqrt(
          (model.orderCounts.get(source.id) ?? 1) * (model.orderCounts.get(candidate.id) ?? 1),
        );
  const content = cosine(model.vectors.get(source.id), model.vectors.get(candidate.id));
  const sameCategory = source.category?.id === candidate.category?.id ? 1 : 0;
  const score =
    WEIGHTS.copurchase * copurchase + WEIGHTS.content * content + WEIGHTS.category * sameCategory;

  let reason;
  if (copurchase > 0 && WEIGHTS.copurchase * copurchase >= WEIGHTS.content * content) {
    reason = { type: 'copurchase', label: `Souvent acheté avec « ${source.name} »` };
  } else if (sameCategory || content > 0.05) {
    reason = { type: 'similar', label: `Proche de « ${source.name} »` };
  } else {
    reason = { type: 'popular', label: 'Populaire en ce moment' };
  }
  return { score, reason };
}

function popularityReason(product) {
  return product.rating.count >= 2 && product.rating.average >= 4.3
    ? {
        type: 'popular',
        label: `Très bien noté (${product.rating.average.toLocaleString('fr-FR')}/5)`,
      }
    : { type: 'popular', label: 'Populaire en ce moment' };
}

/**
 * Recommandations à partir d'un ou plusieurs produits (page produit, panier, historique d'un client).
 * Les produits sources et `exclude` ne sont jamais proposés.
 */
export function recommendFromProducts(model, sourceIds, { limit = 4, exclude = [] } = {}) {
  const sources = sourceIds.map((id) => model.productsById.get(id)).filter(Boolean);
  const excluded = new Set([...sourceIds, ...exclude]);
  const results = [];

  for (const candidate of model.productsById.values()) {
    if (excluded.has(candidate.id)) continue;
    const factor = stockFactor(model, candidate);
    if (factor === 0) continue;
    let best = null;
    let total = 0;
    for (const source of sources) {
      const match = affinity(model, source, candidate);
      total += match.score;
      if (!best || match.score > best.score) best = match;
    }
    // Petit bonus de popularité pour départager les produits à égalité
    const score =
      (total / (sources.length || 1)) * factor + 0.01 * (model.popularity.get(candidate.id) ?? 0);
    if (best && best.score > 0) results.push({ product: candidate, score, reason: best.reason });
  }

  results.sort((a, b) => b.score - a.score);
  const recommendations = results.slice(0, limit);
  if (recommendations.length < limit) {
    const taken = new Set([...excluded, ...recommendations.map((item) => item.product.id)]);
    recommendations.push(
      ...popularProducts(model, { limit: limit - recommendations.length, exclude: [...taken] }),
    );
  }
  return recommendations;
}

/** Produits populaires et bien notés (visiteurs, nouveaux clients). */
export function popularProducts(model, { limit = 4, exclude = [] } = {}) {
  const excluded = new Set(exclude);
  return [...model.productsById.values()]
    .filter((product) => !excluded.has(product.id) && stockFactor(model, product) > 0)
    .map((product) => ({
      product,
      score: (model.popularity.get(product.id) ?? 0) * stockFactor(model, product),
      reason: popularityReason(product),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Évaluation hors échantillon : pour chaque commande récente de plusieurs articles,
 * on cache un article et on vérifie s'il figure dans les `k` recommandations faites à partir
 * des autres (taux de réussite « hit rate@k »), comparé à la simple popularité.
 */
export function evaluateRecommender({ products, trainOrders, testOrders, k = 4 }) {
  const model = buildRecommender({ products, orders: trainOrders });
  let cases = 0;
  let hits = 0;
  let popularityHits = 0;
  const popular = new Set(popularProducts(model, { limit: k }).map((item) => item.product.id));
  for (const order of testOrders) {
    const ids = [...new Set(order.items.map((item) => item.productId))];
    if (ids.length < 2) continue;
    for (const hidden of ids) {
      const others = ids.filter((id) => id !== hidden);
      const recommended = recommendFromProducts(model, others, { limit: k }).map(
        (item) => item.product.id,
      );
      cases += 1;
      if (recommended.includes(hidden)) hits += 1;
      if (popular.has(hidden)) popularityHits += 1;
    }
  }
  return {
    cases,
    hitRate: cases ? Math.round((hits / cases) * 1000) / 1000 : null,
    popularityHitRate: cases ? Math.round((popularityHits / cases) * 1000) / 1000 : null,
  };
}
