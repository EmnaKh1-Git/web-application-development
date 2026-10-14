import { AI_SOURCE, ORDER_STATUS } from '@smart-ecommerce/shared';
import { cached } from '../ai.cache.js';
import { getCatalog, getOrders } from '../ai.data.js';
import { buildRecommender, popularProducts, recommendFromProducts } from '../engine/recommender.js';
import { getStockBoosts } from './forecast.service.js';

const validOrders = (orders) => orders.filter((order) => order.status !== ORDER_STATUS.CANCELLED);

/** Modèle de recommandation (recalculé après chaque commande, sinon toutes les 5 minutes). */
function getRecommender() {
  return cached('orders:model:recommender', 5 * 60_000, async () => {
    const [products, orders, stockBoosts] = await Promise.all([
      getCatalog(),
      getOrders(),
      getStockBoosts(),
    ]);
    return buildRecommender({ products, orders: validOrders(orders), stockBoosts });
  });
}

const toResponse = (context, items) => ({
  context,
  source: AI_SOURCE.LOCAL,
  items: items.map(({ product, reason }) => ({ product, reason })),
});

/**
 * Recommandations selon le contexte :
 * - productId : « Vous aimerez aussi » (page produit) ;
 * - productIds : « Complétez votre panier » ;
 * - utilisateur connecté : « Recommandé pour vous » (d'après ses achats) ;
 * - sinon : produits populaires et bien notés.
 */
export async function getRecommendations({ productId, productIds = [], user, limit = 4 }) {
  const model = await getRecommender();

  if (productId) {
    return toResponse('product', recommendFromProducts(model, [productId], { limit }));
  }
  if (productIds.length > 0) {
    return toResponse('cart', recommendFromProducts(model, productIds, { limit }));
  }
  if (user) {
    const purchased = validOrders(await getOrders())
      .filter((order) => order.userId === user.id)
      .reverse() // les achats les plus récents d'abord
      .flatMap((order) => order.items.map((item) => item.productId));
    const recent = [...new Set(purchased)].slice(0, 8);
    if (recent.length > 0) {
      return toResponse(
        'personal',
        recommendFromProducts(model, recent, { limit, exclude: [...new Set(purchased)] }),
      );
    }
  }
  return toResponse('popular', popularProducts(model, { limit }));
}
