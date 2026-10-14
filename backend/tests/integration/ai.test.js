import {
  AI_LEVEL,
  COMPLAINT_CATEGORY,
  CUSTOMER_SEGMENT,
  ROLES,
  STOCK_RISK,
} from '@smart-ecommerce/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import {
  createAuthenticatedUser,
  createTestCategory,
  createTestProduct,
} from '../helpers/factories.js';
import { placeOrder } from '../helpers/orders.js';

const app = createApp();
const api = (method, url, user) => {
  const call = request(app)[method](`/api/v1/ai${url}`);
  return user ? call.set('Authorization', user.authHeader) : call;
};

let client;
let admin;
let stockManager;

beforeEach(async () => {
  client = await createAuthenticatedUser();
  admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
  stockManager = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });
});

describe('IA — boutique', () => {
  it('indique le fournisseur actif (IA locale pendant les tests)', async () => {
    const res = await api('get', '/status');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ provider: 'local', claudeConfigured: false });
  });

  it('recommande les produits achetés ensemble, jamais un produit en rupture', async () => {
    const sport = await createTestCategory({ name: 'Sport' });
    const racket = await createTestProduct({ name: 'Raquette de tennis', categoryId: sport.id });
    const balls = await createTestProduct({ name: 'Balles de tennis', categoryId: sport.id });
    const football = await createTestProduct({ name: 'Ballon de football', categoryId: sport.id });
    const shorts = await createTestProduct({
      name: 'Short de tennis',
      categoryId: sport.id,
      quantity: 0,
    });
    await placeOrder(app, client, [
      { productId: racket.id, quantity: 1 },
      { productId: balls.id, quantity: 1 },
    ]);
    await placeOrder(app, admin, [
      { productId: racket.id, quantity: 1 },
      { productId: balls.id, quantity: 2 },
    ]);
    await placeOrder(app, admin, [{ productId: football.id, quantity: 1 }]);

    const res = await api('get', `/recommendations?productId=${racket.id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.context).toBe('product');
    expect(res.body.data.items[0]).toMatchObject({
      product: { id: balls.id },
      reason: { type: 'copurchase', label: 'Souvent acheté avec « Raquette de tennis »' },
    });
    const ids = res.body.data.items.map((item) => item.product.id);
    expect(ids).not.toContain(shorts.id);
    expect(ids).not.toContain(racket.id);
  });

  it('personnalise les recommandations du client connecté sans reproposer ses achats', async () => {
    const racket = await createTestProduct({ name: 'Raquette de tennis' });
    await createTestProduct({ name: 'Ballon de football' });
    await placeOrder(app, client, [{ productId: racket.id, quantity: 1 }]);

    const res = await api('get', '/recommendations', client);

    expect(res.body.data.context).toBe('personal');
    expect(res.body.data.items.map((item) => item.product.id)).not.toContain(racket.id);
  });

  it('résume les avis d’un produit à partir de 2 avis', async () => {
    const dress = await createTestProduct({ name: 'Robe d’été' });
    const review = (userId, rating, comment) =>
      models.Review.create({ userId, productId: dress.id, rating, comment });
    await review(client.user.id, 5, 'Le tissu est doux et de très bonne qualité.');

    const tooFew = await api('get', `/products/${dress.id}/reviews-summary`);
    await review(admin.user.id, 2, 'La taille est trop petite, déçue.');
    const res = await api('get', `/products/${dress.id}/reviews-summary`);

    expect(tooFew.body.data).toMatchObject({ available: false, count: 1, minimum: 2 });
    expect(res.body.data).toMatchObject({ available: true, count: 2, source: 'local' });
    expect(res.body.data.summary).toMatch(/2 avis/);
  });

  it('répond avec des produits disponibles dans le budget demandé', async () => {
    const cheap = await createTestProduct({ name: 'Écouteurs sans fil', price: 249 });
    const expensive = await createTestProduct({ name: 'Écouteurs haut de gamme', price: 1999 });

    const res = await api('post', '/assistant').send({
      messages: [{ role: 'user', content: 'Des écouteurs à moins de 300 DT' }],
    });

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('local');
    const ids = res.body.data.products.map((product) => product.id);
    expect(ids).toContain(cheap.id);
    expect(ids).not.toContain(expensive.id);
  });

  it('valide la conversation envoyée à l’assistant', async () => {
    const res = await api('post', '/assistant').send({
      messages: [{ role: 'assistant', content: 'Bonjour' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('IA — stock (module de Yassine)', () => {
  it('réserve les prévisions aux rôles du stock', async () => {
    expect((await api('get', '/stock/forecast', client)).status).toBe(403);
    expect((await api('get', '/stock/forecast', stockManager)).status).toBe(200);
  });

  it('prévoit la rupture d’un produit très demandé et conseille un réassort', async () => {
    const product = await createTestProduct({ name: 'Gourde isotherme', quantity: 10 });
    await placeOrder(app, client, [{ productId: product.id, quantity: 3 }]);
    await placeOrder(app, admin, [{ productId: product.id, quantity: 3 }]);

    const list = await api('get', '/stock/forecast', stockManager);
    const detail = await api('get', `/stock/forecast/${product.id}?horizon=14`, stockManager);

    const item = list.body.data.items.find((entry) => entry.productId === product.id);
    expect(item).toMatchObject({ risk: STOCK_RISK.CRITICAL, quantity: 10 });
    expect(item.suggestedQuantity).toBeGreaterThan(0);
    expect(list.body.data.summary.critical).toBeGreaterThanOrEqual(1);
    expect(detail.body.data.forecast).toHaveLength(14);
    expect(detail.body.data.forecast[0]).toHaveProperty('projectedStock');
  });

  it('lit un bon de livraison collé et rapproche ses lignes du catalogue', async () => {
    const racket = await createTestProduct({ name: 'Raquette de tennis', quantity: 4 });

    const res = await api('post', '/stock/reception', stockManager).send({
      text: 'BL n° FR-118\n10 x RAQUETTE TENNIS\n3 x Trottinette électrique XR',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ source: 'local', reference: 'FR-118' });
    expect(res.body.data.lines[0]).toMatchObject({
      quantity: 10,
      status: 'matched',
      productId: racket.id,
      currentStock: 4,
    });
    expect(res.body.data.lines[1].status).toBe('unknown');
    // L'IA ne modifie rien : le stock reste inchangé tant que le gestionnaire n'a pas validé
    expect((await models.Stock.findOne({ where: { productId: racket.id } })).quantity).toBe(4);
  });

  it('refuse la lecture d’une photo quand Claude n’est pas configuré', async () => {
    const res = await api('post', '/stock/reception', stockManager).send({
      image: 'aGVsbG8=',
      mediaType: 'image/jpeg',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AI_VISION_UNAVAILABLE');
  });

  it('réserve la réception au droit de gérer le stock', async () => {
    const res = await api('post', '/stock/reception', client).send({ text: '1 x Produit' });
    expect(res.status).toBe(403);
  });
});

describe('IA — back-office', () => {
  it('classe et priorise les réclamations', async () => {
    const complaint = await models.Complaint.create({
      userId: client.user.id,
      subject: 'Colis toujours pas reçu !!',
      description: 'Le transporteur ne répond pas, c’est inadmissible. Merci de faire vite.',
      createdAt: new Date(Date.now() - 6 * 86_400_000),
    });

    const res = await api('get', '/complaints/insights', admin);
    const forbidden = await api('get', '/complaints/insights', stockManager);

    expect(res.body.data.items[complaint.id]).toMatchObject({
      category: COMPLAINT_CATEGORY.DELIVERY,
      priority: AI_LEVEL.HIGH,
    });
    expect(res.body.data.summary.urgentOpen).toBe(1);
    expect(forbidden.status).toBe(403);
  });

  it('propose un brouillon de réponse personnalisé', async () => {
    const complaint = await models.Complaint.create({
      userId: client.user.id,
      subject: 'Produit cassé',
      description: 'Le blender est arrivé cassé, il ne fonctionne pas du tout.',
    });

    const res = await api('post', `/complaints/${complaint.id}/reply`, admin);

    expect(res.status).toBe(200);
    expect(res.body.data.source).toBe('local');
    expect(res.body.data.reply).toMatch(/^Bonjour Test,/);
    expect(res.body.data.analysis.category).toBe(COMPLAINT_CATEGORY.DEFECTIVE);
  });

  it('suggère la catégorie et rédige la description d’un nouveau produit', async () => {
    const sport = await createTestCategory({ name: 'Sport' });
    const beauty = await createTestCategory({ name: 'Beauté' });
    for (const name of ['Ballon de football', 'Ballon de volleyball', 'Raquette de tennis']) {
      await createTestProduct({ name, categoryId: sport.id });
    }
    for (const name of ['Rouge à lèvres', 'Mascara noir', 'Vernis à ongles']) {
      await createTestProduct({ name, categoryId: beauty.id });
    }

    const category = await api('post', '/products/categorize', admin).send({
      name: 'Ballon de basketball',
    });
    const description = await api('post', '/products/describe', admin).send({
      name: 'Ballon de basketball',
      categoryId: sport.id,
      sizes: ['5', '7'],
    });

    expect(category.body.data.suggestions[0]).toMatchObject({
      categoryId: sport.id,
      name: 'Sport',
    });
    expect(description.body.data.source).toBe('local');
    expect(description.body.data.description).toContain('Ballon de basketball');
    expect(description.body.data.description).toContain('en tailles 5, 7');
  });

  it('note le risque des commandes à traiter', async () => {
    const product = await createTestProduct({ quantity: 20 });
    const order = await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]);

    const res = await api('get', `/orders/risk?ids=${order.id}`, admin);

    expect(res.status).toBe(200);
    expect(res.body.data.items[order.id]).toMatchObject({
      level: expect.any(String),
      reasons: expect.arrayContaining(['Première commande de ce client']),
    });
  });

  it('segmente les clients (administrateur uniquement)', async () => {
    const product = await createTestProduct({ quantity: 20 });
    await placeOrder(app, client, [{ productId: product.id, quantity: 1 }]);
    const buyer = await createAuthenticatedUser();

    const res = await api('get', '/customers/segments', admin);

    expect(res.body.data.items[client.user.id].segment).not.toBe(CUSTOMER_SEGMENT.NO_ORDER);
    expect(res.body.data.items[buyer.user.id].segment).toBe(CUSTOMER_SEGMENT.NO_ORDER);
    expect((await api('get', '/customers/segments', stockManager)).status).toBe(403);
  });

  it('ouvre le briefing et l’évaluation du Centre IA au back-office', async () => {
    const briefing = await api('get', '/briefing', stockManager);
    const evaluation = await api('get', '/evaluation', admin);

    expect(briefing.status).toBe(200);
    expect(briefing.body.data).toMatchObject({ insights: expect.any(Array), source: 'local' });
    expect(evaluation.body.data).toHaveProperty('forecast');
    expect(evaluation.body.data.complaintClassifier.accuracy).toBe(1);
    expect((await api('get', '/briefing', client)).status).toBe(403);
  });
});
