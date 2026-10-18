import { ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import { createAuthenticatedUser, createTestProduct } from '../helpers/factories.js';

const app = createApp();

describe('Module Stock', () => {
  it('est réservé au back-office : CLIENT refusé (403)', async () => {
    const client = await createAuthenticatedUser();

    const res = await request(app).get('/api/v1/stock').set('Authorization', client.authHeader);

    expect(res.status).toBe(403);
  });

  it('filtre les produits en rupture et en stock faible', async () => {
    const manager = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });
    await createTestProduct({ name: 'Bien fourni', quantity: 40 });
    await createTestProduct({ name: 'Presque vide', quantity: 2 });
    await createTestProduct({ name: 'Épuisé', quantity: 0 });

    const names = async (status) =>
      (
        await request(app)
          .get('/api/v1/stock')
          .query({ status })
          .set('Authorization', manager.authHeader)
      ).body.data.map((stock) => stock.product.name);

    expect(await names('out')).toEqual(['Épuisé']);
    expect(await names('low')).toEqual(['Presque vide']);
    expect((await names('alert')).sort()).toEqual(['Presque vide', 'Épuisé'].sort());
  });

  it('ajoute du stock et enregistre un mouvement d’entrée', async () => {
    const manager = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });
    const product = await createTestProduct({ quantity: 3 });

    const res = await request(app)
      .post(`/api/v1/stock/${product.id}/add`)
      .set('Authorization', manager.authHeader)
      .send({ quantity: 12, reason: 'Livraison fournisseur' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ quantity: 15, status: 'OK' });
    const movement = await models.StockMovement.findOne({ where: { productId: product.id } });
    expect(movement).toMatchObject({
      type: 'IN',
      quantityChange: 12,
      quantityAfter: 15,
      reason: 'Livraison fournisseur',
      userId: manager.user.id,
    });
  });

  it('corrige la quantité (mouvement signé) et le seuil d’alerte', async () => {
    const manager = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });
    const product = await createTestProduct({ quantity: 20 });

    const res = await request(app)
      .patch(`/api/v1/stock/${product.id}`)
      .set('Authorization', manager.authHeader)
      .send({ quantity: 8, lowStockThreshold: 10 });

    expect(res.body.data).toMatchObject({ quantity: 8, lowStockThreshold: 10, status: 'LOW' });
    const history = await request(app)
      .get(`/api/v1/stock/${product.id}/movements`)
      .set('Authorization', manager.authHeader);
    expect(history.body.data[0]).toMatchObject({
      type: 'ADJUST',
      quantityChange: -12,
      quantityAfter: 8,
    });
  });

  it('résume le stock pour le tableau de bord', async () => {
    const manager = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });
    await createTestProduct({ quantity: 10 });
    await createTestProduct({ quantity: 0 });
    await createTestProduct({ quantity: 1 });

    const res = await request(app)
      .get('/api/v1/stock/summary')
      .set('Authorization', manager.authHeader);

    expect(res.body.data).toEqual({ totalProducts: 3, totalUnits: 11, outOfStock: 1, lowStock: 1 });
  });
});
