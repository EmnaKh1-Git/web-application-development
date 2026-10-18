import { describe, expect, it } from 'vitest';
import {
  buildRecommender,
  evaluateRecommender,
  popularProducts,
  recommendFromProducts,
} from '../../../src/modules/ai/engine/recommender.js';

const product = (id, name, category, { status = 'OK', salesCount = 5, rating = [4, 2] } = {}) => ({
  id,
  name,
  description: `${name} de démonstration`,
  category: { id: category, name: `Catégorie ${category}` },
  isActive: true,
  salesCount,
  rating: { average: rating[0], count: rating[1] },
  stock: { status },
});

const PRODUCTS = [
  product(1, 'Raquette de tennis', 1),
  product(2, 'Lot de balles de tennis', 1),
  product(3, 'Ballon de football', 1, { salesCount: 50 }),
  product(4, 'Robe d’été', 2),
  product(5, 'Short de tennis', 1, { status: 'OUT' }),
];
const order = (...ids) => ({ items: ids.map((productId) => ({ productId })) });

describe('Recommandations', () => {
  const model = buildRecommender({
    products: PRODUCTS,
    orders: [order(1, 2), order(1, 2), order(1, 2, 3), order(3), order(4)],
  });

  it('propose d’abord le produit souvent acheté avec, en expliquant pourquoi', () => {
    const [first] = recommendFromProducts(model, [1], { limit: 3 });
    expect(first.product.id).toBe(2);
    expect(first.reason).toEqual({
      type: 'copurchase',
      label: 'Souvent acheté avec « Raquette de tennis »',
    });
  });

  it('ne propose jamais un produit en rupture ni le produit consulté', () => {
    const ids = recommendFromProducts(model, [1], { limit: 10 }).map((item) => item.product.id);
    expect(ids).not.toContain(5);
    expect(ids).not.toContain(1);
  });

  it('met en avant le stock dormant', () => {
    const boosted = buildRecommender({
      products: PRODUCTS,
      orders: [],
      stockBoosts: new Map([[4, 3]]),
    });
    expect(popularProducts(boosted, { limit: 1 })[0].product.id).toBe(4);
  });

  it('mesure le taux de réussite contre la popularité', () => {
    const result = evaluateRecommender({
      products: PRODUCTS,
      trainOrders: [order(1, 2), order(1, 2), order(3), order(3)],
      testOrders: [order(1, 2)],
      k: 1,
    });
    expect(result.cases).toBe(2);
    expect(result.hitRate).toBe(1);
    expect(result.popularityHitRate).toBe(0);
  });
});
