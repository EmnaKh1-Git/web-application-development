import { ORDER_STATUS, ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import {
  createAuthenticatedUser,
  createTestAddress,
  createTestProduct,
} from '../helpers/factories.js';
import { placeOrder } from '../helpers/orders.js';

const app = createApp();
const stockOf = async (productId) =>
  (await models.Stock.findOne({ where: { productId } })).quantity;
const setStatus = (orderId, status, admin) =>
  request(app)
    .patch(`/api/v1/admin/orders/${orderId}/status`)
    .set('Authorization', admin.authHeader)
    .send({ status });

let client;
let admin;
let product;

beforeEach(async () => {
  client = await createAuthenticatedUser();
  admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
  product = await createTestProduct({ name: 'Montre', price: 149.95, quantity: 5 });
});

describe('Panier', () => {
  it('ajoute un produit avec le prix lu en base et calcule le total', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', client.authHeader)
      .send({ productId: product.id, quantity: 2, price: 1 }); // le prix envoyé est ignoré

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalItems: 2,
      totalAmount: 299.9,
      items: [{ productId: product.id, unitPrice: 149.95, quantity: 2, isAvailable: true }],
    });
  });

  it('refuse une quantité supérieure au stock (409 INSUFFICIENT_STOCK)', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', client.authHeader)
      .send({ productId: product.id, quantity: 6 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('refuse une commande avec un panier vide', async () => {
    const address = await createTestAddress(client.user.id);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', client.authHeader)
      .send({ addressId: address.id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EMPTY_CART');
  });
});

describe('Cycle de vie d’une commande', () => {
  it('crée une commande EN ATTENTE sans diminuer le stock, et vide le panier', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 2 }]);

    expect(order).toMatchObject({
      status: ORDER_STATUS.PENDING,
      totalAmount: 299.9,
      itemsCount: 2,
      shippingAddress: { city: 'Tunis', recipient: expect.any(String) },
      delivery: { status: 'PENDING' },
    });
    expect(await stockOf(product.id)).toBe(5);
    const cart = await request(app).get('/api/v1/cart').set('Authorization', client.authHeader);
    expect(cart.body.data.items).toEqual([]);
  });

  it('diminue le stock à la CONFIRMATION et augmente la popularité', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 2 }]);

    const res = await setStatus(order.id, ORDER_STATUS.CONFIRMED, admin);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(await stockOf(product.id)).toBe(3);
    const movement = await models.StockMovement.findOne({ where: { orderId: order.id } });
    expect(movement).toMatchObject({ type: 'OUT', quantityChange: -2, quantityAfter: 3 });
    expect((await models.Product.findByPk(product.id)).salesCount).toBe(2);
  });

  it('refuse la confirmation si le stock est devenu insuffisant, sans rien modifier', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 4 }]);
    await models.Stock.update({ quantity: 1 }, { where: { productId: product.id } });

    const res = await setStatus(order.id, ORDER_STATUS.CONFIRMED, admin);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(res.body.error.details[0]).toMatchObject({ requested: 4, available: 1 });
    expect(await stockOf(product.id)).toBe(1);
    expect((await models.Order.findByPk(order.id)).status).toBe(ORDER_STATUS.PENDING);
  });

  it('restaure le stock quand le client annule une commande confirmée', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 2 }], {
      statuses: [{ status: ORDER_STATUS.CONFIRMED, admin }],
    });

    const res = await request(app)
      .patch(`/api/v1/orders/${order.id}/cancel`)
      .set('Authorization', client.authHeader);

    expect(res.body.data).toMatchObject({ status: ORDER_STATUS.CANCELLED, canCancel: false });
    expect(await stockOf(product.id)).toBe(5);
    expect((await models.Product.findByPk(product.id)).salesCount).toBe(0);
    const types = (
      await models.StockMovement.findAll({ where: { orderId: order.id }, order: [['id', 'ASC']] })
    ).map((movement) => movement.type);
    expect(types).toEqual(['OUT', 'RETURN']);
  });

  it('génère le suivi à l’expédition puis interdit l’annulation', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 1 }], {
      statuses: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED].map((status) => ({
        status,
        admin,
      })),
    });

    expect(order.delivery).toMatchObject({
      status: 'IN_TRANSIT',
      carrier: expect.any(String),
      trackingNumber: expect.stringMatching(/^SE-/),
    });
    const cancel = await request(app)
      .patch(`/api/v1/orders/${order.id}/cancel`)
      .set('Authorization', client.authHeader);
    expect(cancel.status).toBe(409);
    expect(cancel.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
  });

  it('refuse une transition de statut invalide (PENDING → DELIVERED)', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]);

    const res = await setStatus(order.id, ORDER_STATUS.DELIVERED, admin);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('empêche un client de consulter la commande d’un autre (403)', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]);
    const otherClient = await createAuthenticatedUser();

    const res = await request(app)
      .get(`/api/v1/orders/${order.id}`)
      .set('Authorization', otherClient.authHeader);

    expect(res.status).toBe(403);
  });

  it('fournit les statistiques des commandes au back-office', async () => {
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }], {
      statuses: [{ status: ORDER_STATUS.CONFIRMED, admin }],
    });

    const res = await request(app)
      .get('/api/v1/admin/orders/stats')
      .set('Authorization', admin.authHeader);

    expect(res.body.data).toMatchObject({
      totalOrders: 1,
      revenue: 149.95,
      byStatus: { CONFIRMED: 1, PENDING: 0 },
    });
  });
});

describe('Variantes (tailles et couleurs)', () => {
  let tshirt;
  const addToCart = (body) =>
    request(app).post('/api/v1/cart/items').set('Authorization', client.authHeader).send(body);

  beforeEach(async () => {
    tshirt = await createTestProduct({
      name: 'T-shirt',
      quantity: 5,
      sizes: ['S', 'M'],
      colors: ['Noir', 'Blanc'],
    });
  });

  it('exige une taille et une couleur proposées par le produit', async () => {
    const withoutColor = await addToCart({ productId: tshirt.id, size: 'S' });
    const unknownColor = await addToCart({ productId: tshirt.id, size: 'S', color: 'Vert' });

    expect(withoutColor.status).toBe(400);
    expect(withoutColor.body.error.code).toBe('PRODUCT_COLOR_REQUIRED');
    expect(unknownColor.status).toBe(400);
    expect(unknownColor.body.error.code).toBe('INVALID_PRODUCT_COLOR');
  });

  it('crée une ligne par variante et regroupe les ajouts d’une même variante', async () => {
    await addToCart({ productId: tshirt.id, size: 'S', color: 'Noir' });
    await addToCart({ productId: tshirt.id, size: 'M', color: 'Blanc', quantity: 2 });
    const res = await addToCart({ productId: tshirt.id, size: 'S', color: 'Noir' });

    expect(res.status).toBe(200);
    expect(res.body.data.items).toMatchObject([
      { size: 'S', color: 'Noir', quantity: 2 },
      { size: 'M', color: 'Blanc', quantity: 2 },
    ]);
  });

  it('partage le stock entre toutes les variantes d’un produit', async () => {
    await addToCart({ productId: tshirt.id, size: 'S', color: 'Noir', quantity: 3 });
    const tooMany = await addToCart({
      productId: tshirt.id,
      size: 'M',
      color: 'Blanc',
      quantity: 3,
    });
    const cart = await addToCart({ productId: tshirt.id, size: 'M', color: 'Blanc', quantity: 2 });
    const line = cart.body.data.items.find((item) => item.size === 'M');
    const update = await request(app)
      .patch(`/api/v1/cart/items/${line.id}`)
      .set('Authorization', client.authHeader)
      .send({ quantity: 3 });

    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(cart.status).toBe(200);
    expect(update.status).toBe(409);
  });

  it('refuse la commande si le total des variantes dépasse le stock', async () => {
    const address = await createTestAddress(client.user.id);
    await addToCart({ productId: tshirt.id, size: 'S', color: 'Noir', quantity: 3 });
    await addToCart({ productId: tshirt.id, size: 'M', color: 'Blanc', quantity: 2 });
    await models.Stock.update({ quantity: 4 }, { where: { productId: tshirt.id } });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', client.authHeader)
      .send({ addressId: address.id });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CART_UNAVAILABLE_ITEMS');
    expect(res.body.error.details[0].message).toContain('4 disponible(s) pour 5 demandé(s)');
  });

  it('déduit puis restaure le stock en un seul mouvement par produit', async () => {
    const order = await placeOrder(
      app,
      client,
      [
        { productId: tshirt.id, size: 'S', color: 'Noir', quantity: 2 },
        { productId: tshirt.id, size: 'M', color: 'Blanc', quantity: 3 },
      ],
      { statuses: [{ status: ORDER_STATUS.CONFIRMED, admin }] },
    );
    expect(order.items).toMatchObject([
      { size: 'S', color: 'Noir', quantity: 2 },
      { size: 'M', color: 'Blanc', quantity: 3 },
    ]);
    expect(await stockOf(tshirt.id)).toBe(0);

    await setStatus(order.id, ORDER_STATUS.CANCELLED, admin);

    expect(await stockOf(tshirt.id)).toBe(5);
    const movements = await models.StockMovement.findAll({
      where: { orderId: order.id },
      order: [['id', 'ASC']],
    });
    expect(movements.map(({ type, quantityChange }) => ({ type, quantityChange }))).toEqual([
      { type: 'OUT', quantityChange: -5 },
      { type: 'RETURN', quantityChange: 5 },
    ]);
  });
});
