import { ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import {
  createAuthenticatedUser,
  createTestCategory,
  createTestProduct,
} from '../helpers/factories.js';

const app = createApp();

describe('Catalogue public : GET /api/v1/products', () => {
  let tech;

  beforeEach(async () => {
    tech = await createTestCategory({ name: 'High-tech' });
    const maison = await createTestCategory({ name: 'Maison' });
    await createTestProduct({ name: 'Casque audio', price: 300, categoryId: tech.id });
    await createTestProduct({ name: 'Clavier', price: 80, categoryId: tech.id, quantity: 0 });
    await createTestProduct({ name: 'Lampe', price: 45, categoryId: maison.id });
    await createTestProduct({ name: 'Produit retiré', price: 10, isActive: false });
  });

  it('ne montre que les produits actifs, avec catégorie et disponibilité', async () => {
    const res = await request(app).get('/api/v1/products');

    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(3);
    const clavier = res.body.data.find((product) => product.name === 'Clavier');
    expect(clavier.category.name).toBe('High-tech');
    expect(clavier.stock).toMatchObject({ availableQuantity: 0, inStock: false, status: 'OUT' });
  });

  it('filtre par catégorie, prix et disponibilité, et trie par prix croissant', async () => {
    const res = await request(app).get('/api/v1/products').query({
      categoryId: tech.id,
      minPrice: 50,
      inStock: true,
      sort: 'price_asc',
    });

    expect(res.body.data.map((product) => product.name)).toEqual(['Casque audio']);
  });

  it('recherche dans le nom et la description', async () => {
    const res = await request(app).get('/api/v1/products').query({ search: 'lamp' });

    expect(res.body.data.map((product) => product.name)).toEqual(['Lampe']);
  });

  it('refuse un intervalle de prix incohérent', async () => {
    const res = await request(app).get('/api/v1/products').query({ minPrice: 100, maxPrice: 10 });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('maxPrice');
  });
});

describe('Gestion des produits (products:manage)', () => {
  it('crée un produit avec son stock initial (module Stock)', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const category = await createTestCategory();

    const res = await request(app)
      .post('/api/v1/products')
      .set('Authorization', admin.authHeader)
      .send({
        name: 'Écouteurs sans fil',
        categoryId: category.id,
        price: '129.90',
        description: 'Écouteurs Bluetooth avec étui de charge.',
        initialStock: 25,
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      slug: 'ecouteurs-sans-fil',
      price: 129.9,
      stock: { availableQuantity: 25, inStock: true },
    });
    const movement = await models.StockMovement.findOne({ where: { productId: res.body.data.id } });
    expect(movement).toMatchObject({ type: 'IN', quantityChange: 25, quantityAfter: 25 });
  });

  it('refuse la création à un client (403) et une catégorie inexistante (400)', async () => {
    const client = await createAuthenticatedUser();
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const product = {
      name: 'Produit',
      categoryId: 9999,
      price: 10,
      description: 'Une description valide.',
    };

    const forbidden = await request(app)
      .post('/api/v1/products')
      .set('Authorization', client.authHeader)
      .send(product);
    const invalid = await request(app)
      .post('/api/v1/products')
      .set('Authorization', admin.authHeader)
      .send(product);

    expect(forbidden.status).toBe(403);
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.details[0].field).toBe('categoryId');
  });

  it('désactive un produit : invisible au public, visible par l’administrateur', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const product = await createTestProduct();

    const deleted = await request(app)
      .delete(`/api/v1/products/${product.id}`)
      .set('Authorization', admin.authHeader);
    const asPublic = await request(app).get(`/api/v1/products/${product.id}`);
    const asAdmin = await request(app)
      .get(`/api/v1/products/${product.id}`)
      .set('Authorization', admin.authHeader);

    expect(deleted.status).toBe(204);
    expect(asPublic.status).toBe(404);
    expect(asAdmin.body.data.isActive).toBe(false);
  });
});

describe('Catégories', () => {
  it('liste les catégories avec leur nombre de produits actifs', async () => {
    const category = await createTestCategory({ name: 'Sport' });
    await createTestProduct({ categoryId: category.id });
    await createTestProduct({ categoryId: category.id, isActive: false });

    const res = await request(app).get('/api/v1/categories');

    expect(res.body.data).toEqual([expect.objectContaining({ name: 'Sport', productCount: 1 })]);
  });

  it('refuse un nom en double et la suppression d’une catégorie non vide (409)', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const category = await createTestCategory({ name: 'Livres' });
    await createTestProduct({ categoryId: category.id });

    const duplicate = await request(app)
      .post('/api/v1/categories')
      .set('Authorization', admin.authHeader)
      .send({ name: 'Livres' });
    const notEmpty = await request(app)
      .delete(`/api/v1/categories/${category.id}`)
      .set('Authorization', admin.authHeader);

    expect(duplicate.body.error.code).toBe('CATEGORY_NAME_TAKEN');
    expect(notEmpty.status).toBe(409);
    expect(notEmpty.body.error.code).toBe('CATEGORY_NOT_EMPTY');
  });
});
