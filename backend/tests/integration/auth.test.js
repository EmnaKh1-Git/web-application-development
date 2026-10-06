import { PERMISSIONS, ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { models } from '../../src/database/index.js';
import { createAuthenticatedUser, createTestUser } from '../helpers/factories.js';

const app = createApp();

const validRegistration = {
  firstName: 'Amine',
  lastName: 'Ben Ali',
  email: 'Amine.BenAli@Example.com',
  password: 'Motdepasse1',
};

describe('POST /api/v1/auth/register', () => {
  it('crée un compte CLIENT et retourne un jeton + l’utilisateur', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({
      firstName: 'Amine',
      email: 'amine.benali@example.com', // normalisé en minuscules
      role: ROLES.CLIENT,
      isActive: true,
    });
    expect(res.body.data.user.permissions).toContain(PERMISSIONS.CART_MANAGE);
  });

  it('ne renvoie jamais le mot de passe ni son hash, et le stocke haché', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
    const stored = await models.User.scope('withPassword').findOne({
      where: { email: 'amine.benali@example.com' },
    });
    expect(stored.passwordHash).not.toBe(validRegistration.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('ignore un rôle envoyé par le client (pas d’auto-promotion ADMIN)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ ...validRegistration, role: ROLES.ADMIN, roleId: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe(ROLES.CLIENT);
  });

  it('refuse un email déjà utilisé (409 EMAIL_ALREADY_USED)', async () => {
    await request(app).post('/api/v1/auth/register').send(validRegistration);
    const res = await request(app).post('/api/v1/auth/register').send(validRegistration);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_USED');
  });

  it('refuse des données invalides avec le détail par champ (400 VALIDATION_ERROR)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ firstName: 'A', email: 'pas-un-email', password: 'faible' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fields = res.body.error.details.map((detail) => detail.field);
    expect(fields).toEqual(expect.arrayContaining(['firstName', 'lastName', 'email', 'password']));
  });
});

describe('POST /api/v1/auth/login', () => {
  it('connecte un utilisateur avec ses identifiants', async () => {
    const { user, password } = await createTestUser({ role: ROLES.STOCK_MANAGER });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email.toUpperCase(), password });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ id: user.id, role: ROLES.STOCK_MANAGER });
  });

  it('répond le même message pour un mauvais mot de passe et un email inconnu', async () => {
    const { user } = await createTestUser();

    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'Mauvais123' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'inconnu@test.local', password: 'Mauvais123' });

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it('refuse la connexion d’un compte bloqué (403 ACCOUNT_DISABLED)', async () => {
    const { user, password } = await createTestUser({ isActive: false });

    const res = await request(app).post('/api/v1/auth/login').send({ email: user.email, password });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});

describe('GET /api/v1/auth/me', () => {
  it('retourne l’utilisateur connecté', async () => {
    const { user, authHeader } = await createAuthenticatedUser({ role: ROLES.ADMIN });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: user.id, email: user.email, role: ROLES.ADMIN });
    expect(res.body.data.permissions).toContain(PERMISSIONS.USERS_MANAGE);
  });

  it('répond 401 AUTH_REQUIRED sans jeton', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('répond 401 INVALID_TOKEN avec un jeton falsifié', async () => {
    const { token } = await createAuthenticatedUser();
    const tampered = `${token.slice(0, -2)}xx`;

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tampered}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('applique immédiatement le blocage d’un compte, même avec un jeton encore valide', async () => {
    const { user, authHeader } = await createAuthenticatedUser();
    await user.update({ isActive: false });

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', authHeader);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_DISABLED');
  });
});
