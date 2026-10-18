import { ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import { createAuthenticatedUser, createTestProduct } from '../helpers/factories.js';
import { deliveredBy, placeOrder } from '../helpers/orders.js';

const app = createApp();
const review = { rating: 4, comment: 'Très bon produit, conforme à la description.' };

let client;
let admin;
let product;

beforeEach(async () => {
  client = await createAuthenticatedUser();
  admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
  product = await createTestProduct();
});

describe('Avis', () => {
  it('refuse l’avis d’un client qui n’a pas reçu le produit (403 PURCHASE_REQUIRED)', async () => {
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]); // commande non livrée

    const res = await request(app)
      .post(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader)
      .send(review);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('PURCHASE_REQUIRED');
  });

  it('accepte l’avis après livraison et met à jour la note du produit', async () => {
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }], {
      statuses: deliveredBy(admin),
    });

    const created = await request(app)
      .post(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader)
      .send(review);
    const duplicate = await request(app)
      .post(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader)
      .send(review);

    expect(created.status).toBe(201);
    expect(created.body.data.author.name).toMatch(/^Test U\.$/);
    expect(duplicate.status).toBe(409);
    const updated = await models.Product.findByPk(product.id);
    expect(Number(updated.ratingAverage)).toBe(4);
    expect(updated.reviewCount).toBe(1);
  });

  it('indique à l’utilisateur connecté s’il peut donner un avis', async () => {
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }], {
      statuses: deliveredBy(admin),
    });

    const before = await request(app)
      .get(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader);
    await request(app)
      .post(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader)
      .send({ rating: 5, comment: 'Parfait, je recommande vivement.' });
    const after = await request(app)
      .get(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader);
    const anonymous = await request(app).get(`/api/v1/products/${product.id}/reviews`);

    expect(before.body.data.viewer).toEqual({ canReview: true, myReview: null });
    expect(after.body.data.viewer.canReview).toBe(false);
    expect(after.body.data.summary).toMatchObject({ average: 5, count: 1 });
    expect(anonymous.body.data.viewer.canReview).toBe(false);
  });

  it('permet à l’administrateur de supprimer un avis, mais pas à un autre client', async () => {
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }], {
      statuses: deliveredBy(admin),
    });
    const created = await request(app)
      .post(`/api/v1/products/${product.id}/reviews`)
      .set('Authorization', client.authHeader)
      .send(review);
    const otherClient = await createAuthenticatedUser();

    const byOther = await request(app)
      .delete(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', otherClient.authHeader);
    const byAdmin = await request(app)
      .delete(`/api/v1/reviews/${created.body.data.id}`)
      .set('Authorization', admin.authHeader);

    expect(byOther.status).toBe(403);
    expect(byAdmin.status).toBe(204);
    expect((await models.Product.findByPk(product.id)).reviewCount).toBe(0);
  });
});

describe('Réclamations', () => {
  it('crée une réclamation liée à une commande du client, puis l’administrateur la traite', async () => {
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]);

    const created = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', client.authHeader)
      .send({
        subject: 'Colis endommagé',
        description: 'Le carton est arrivé ouvert et le produit est rayé.',
        orderId: order.id,
      });
    const closedWithoutAnswer = await request(app)
      .patch(`/api/v1/admin/complaints/${created.body.data.id}`)
      .set('Authorization', admin.authHeader)
      .send({ status: 'RESOLVED' });
    const handled = await request(app)
      .patch(`/api/v1/admin/complaints/${created.body.data.id}`)
      .set('Authorization', admin.authHeader)
      .send({ status: 'RESOLVED', adminResponse: 'Un remplacement vous a été envoyé.' });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ status: 'OPEN', orderId: order.id });
    expect(closedWithoutAnswer.status).toBe(400);
    expect(handled.body.data).toMatchObject({
      status: 'RESOLVED',
      adminResponse: 'Un remplacement vous a été envoyé.',
      handledBy: expect.any(String),
    });
  });

  it('refuse une commande qui n’appartient pas au client', async () => {
    const otherClient = await createAuthenticatedUser();
    const order = await placeOrder(app, otherClient, [{ productId: product.id, quantity: 1 }]);

    const res = await request(app)
      .post('/api/v1/complaints')
      .set('Authorization', client.authHeader)
      .send({
        subject: 'Commande',
        description: 'Je souhaite signaler un problème important.',
        orderId: order.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('orderId');
  });

  it('réserve la liste de toutes les réclamations au back-office', async () => {
    const res = await request(app)
      .get('/api/v1/admin/complaints')
      .set('Authorization', client.authHeader);

    expect(res.status).toBe(403);
  });
});
