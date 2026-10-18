import { ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { createAuthenticatedUser, createTestAddress } from '../helpers/factories.js';

const app = createApp();
const address = {
  label: 'Maison',
  street: '5 avenue Habib Bourguiba',
  city: 'Sousse',
  postalCode: '4000',
};

describe('Mon compte', () => {
  it('modifie le profil', async () => {
    const client = await createAuthenticatedUser();

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', client.authHeader)
      .send({ firstName: 'Salma', lastName: 'Trabelsi', phone: '+216 20 123 456' });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      firstName: 'Salma',
      lastName: 'Trabelsi',
      phone: '+216 20 123 456',
    });
  });

  it('change le mot de passe seulement avec l’ancien mot de passe correct', async () => {
    const client = await createAuthenticatedUser();

    const wrong = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', client.authHeader)
      .send({ currentPassword: 'Mauvais123', newPassword: 'Nouveau2026x' });
    const ok = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', client.authHeader)
      .send({ currentPassword: client.password, newPassword: 'Nouveau2026x' });
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: client.user.email, password: 'Nouveau2026x' });

    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    expect(ok.status).toBe(204);
    expect(login.status).toBe(200);
  });

  it('gère une seule adresse par défaut', async () => {
    const client = await createAuthenticatedUser();
    const post = (body) =>
      request(app)
        .post('/api/v1/users/me/addresses')
        .set('Authorization', client.authHeader)
        .send(body);

    const first = await post(address);
    const second = await post({ ...address, label: 'Travail', isDefault: true });
    await request(app)
      .delete(`/api/v1/users/me/addresses/${second.body.data.id}`)
      .set('Authorization', client.authHeader);
    const list = await request(app)
      .get('/api/v1/users/me/addresses')
      .set('Authorization', client.authHeader);

    expect(first.body.data.isDefault).toBe(true); // première adresse = par défaut
    expect(second.body.data.isDefault).toBe(true);
    expect(list.body.data).toEqual([
      expect.objectContaining({ id: first.body.data.id, isDefault: true }),
    ]);
  });

  it('ne permet pas de modifier l’adresse d’un autre utilisateur (404)', async () => {
    const owner = await createAuthenticatedUser();
    const intruder = await createAuthenticatedUser();
    const ownerAddress = await createTestAddress(owner.user.id);

    const res = await request(app)
      .patch(`/api/v1/users/me/addresses/${ownerAddress.id}`)
      .set('Authorization', intruder.authHeader)
      .send(address);

    expect(res.status).toBe(404);
  });
});

describe('Gestion des utilisateurs (users:manage)', () => {
  it('bloque un utilisateur : son jeton est refusé immédiatement', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const client = await createAuthenticatedUser();

    const blocked = await request(app)
      .patch(`/api/v1/admin/users/${client.user.id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ isActive: false });
    const me = await request(app).get('/api/v1/auth/me').set('Authorization', client.authHeader);

    expect(blocked.body.data.isActive).toBe(false);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('change le rôle d’un utilisateur mais interdit de modifier son propre compte', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const client = await createAuthenticatedUser();

    const promoted = await request(app)
      .patch(`/api/v1/admin/users/${client.user.id}/role`)
      .set('Authorization', admin.authHeader)
      .send({ role: ROLES.STOCK_MANAGER });
    const self = await request(app)
      .patch(`/api/v1/admin/users/${admin.user.id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ isActive: false });

    expect(promoted.body.data.role).toBe(ROLES.STOCK_MANAGER);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });

  it('recherche et filtre les utilisateurs', async () => {
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    await createAuthenticatedUser({ email: 'salma.trabelsi@test.local' });
    await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });

    const bySearch = await request(app)
      .get('/api/v1/admin/users')
      .query({ search: 'salma' })
      .set('Authorization', admin.authHeader);
    const byRole = await request(app)
      .get('/api/v1/admin/users')
      .query({ role: ROLES.STOCK_MANAGER })
      .set('Authorization', admin.authHeader);

    expect(bySearch.body.data.map((user) => user.email)).toEqual(['salma.trabelsi@test.local']);
    expect(byRole.body.meta.total).toBe(1);
  });
});
