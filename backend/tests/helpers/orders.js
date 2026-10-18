import { ORDER_STATUS } from '@smart-ecommerce/shared';
import request from 'supertest';
import { createTestAddress } from './factories.js';

/**
 * Parcours complet via l'API : panier → commande (PENDING) → statuts successifs.
 * @returns {Promise<object>} la commande renvoyée par l'API après le dernier statut
 */
export async function placeOrder(app, client, items, { statuses = [] } = {}) {
  const address = await createTestAddress(client.user.id);
  for (const { productId, quantity, size, color } of items) {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', client.authHeader)
      .send({ productId, quantity, size, color });
    if (res.status !== 200) throw new Error(`Ajout au panier impossible : ${res.text}`);
  }
  const created = await request(app)
    .post('/api/v1/orders')
    .set('Authorization', client.authHeader)
    .send({ addressId: address.id });
  if (created.status !== 201) throw new Error(`Commande impossible : ${created.text}`);

  let order = created.body.data;
  for (const { status, admin } of statuses) {
    const res = await request(app)
      .patch(`/api/v1/admin/orders/${order.id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ status });
    if (res.status !== 200) throw new Error(`Statut ${status} impossible : ${res.text}`);
    order = res.body.data;
  }
  return order;
}

/** Statuts pour amener une commande jusqu'à la livraison. */
export const deliveredBy = (admin) =>
  [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED].map((status) => ({
    status,
    admin,
  }));
