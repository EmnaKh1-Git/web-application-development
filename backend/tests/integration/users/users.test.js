/**
 * Module Utilisateurs (Fares) — tests d'INTÉGRATION avec Jest + Supertest.
 *
 * Supertest envoie de vraies requêtes HTTP à l'API complète (routes, validation, hachage,
 * MySQL, jeton JWT), branchée sur la base MySQL de TEST, vidée avant chaque test.
 * Données fictives uniquement. Chaque test suit le pattern AAA : Préparer → Agir → Vérifier.
 *
 * Lancement : npm run test:jest -w backend -- --selectProjects integration (MySQL démarré)
 */
import { describe, expect, test } from '@jest/globals';
import { ROLES } from '@smart-ecommerce/shared';
import request from 'supertest';
import { createApp } from '../../../src/app.js';
import { models } from '../../../src/database/index.js';
import { createAuthenticatedUser, createTestUser } from '../../helpers/factories.js';

const app = createApp();
const API = '/api/v1';

describe('Utilisateurs — inscription et connexion', () => {
  test('IT-01 — inscription d’un client : compte CLIENT (rôle envoyé ignoré) et mot de passe haché', async () => {
    // Scénario nominal + sécurité : un visiteur crée son compte. Il tente de se donner le rôle
    // ADMIN dans la requête : l'API doit l'ignorer. Le mot de passe ne doit jamais être stocké en clair.

    // Préparer
    const registration = {
      firstName: 'Cléa',
      lastName: 'Test',
      email: 'clea@exemple.test',
      password: 'MotDePasse1', // mot de passe fictif
      role: ROLES.ADMIN,
    };

    // Agir
    const res = await request(app).post(`${API}/auth/register`).send(registration);

    // Vérifier
    expect(res.status).toBe(201);
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toMatchObject({ email: 'clea@exemple.test', role: ROLES.CLIENT });
    const stored = await models.User.scope('withPassword').findOne({
      where: { email: 'clea@exemple.test' },
      include: 'role',
    });
    expect(stored.role.name).toBe(ROLES.CLIENT);
    expect(stored.passwordHash).not.toBe(registration.password);
    expect(stored.passwordHash).toMatch(/^\$2[aby]\$/); // empreinte bcrypt
  });

  test('IT-02 — mot de passe incorrect : 401 sans jeton, même réponse qu’avec un email inconnu', async () => {
    // Cas d'erreur + sécurité : un intrus essaie de se connecter. Aucun jeton n'est délivré,
    // et la réponse ne révèle pas si le compte existe (même message pour un email inconnu).

    // Préparer
    await createTestUser({ email: 'sami@exemple.test' });
    const wrongPassword = { email: 'sami@exemple.test', password: 'MauvaisMotDePasse9' };
    const unknownEmail = { email: 'inconnu@exemple.test', password: 'MauvaisMotDePasse9' };

    // Agir
    const withWrongPassword = await request(app).post(`${API}/auth/login`).send(wrongPassword);
    const withUnknownEmail = await request(app).post(`${API}/auth/login`).send(unknownEmail);

    // Vérifier
    const expectedError = {
      code: 'INVALID_CREDENTIALS',
      message: 'Email ou mot de passe incorrect',
    };
    expect(withWrongPassword.status).toBe(401);
    expect(withWrongPassword.body.error).toMatchObject(expectedError);
    expect(withWrongPassword.body.data).toBeUndefined(); // aucun jeton
    expect(withUnknownEmail.status).toBe(401);
    expect(withUnknownEmail.body.error).toMatchObject(expectedError);
  });

  test('IT-04 — mot de passe de 7 caractères refusé, 8 caractères accepté, email mis en minuscules', async () => {
    // Cas limite : la longueur minimale du mot de passe est 8. On teste juste en dessous (7)
    // et exactement à la limite (8). L'email saisi avec des majuscules est enregistré en minuscules.

    // Préparer
    const person = { firstName: 'Cléa', lastName: 'Test', email: 'Clea@Exemple.TEST' };

    // Agir
    const sevenCharacters = await request(app)
      .post(`${API}/auth/register`)
      .send({ ...person, password: 'Abcdef1' });
    const eightCharacters = await request(app)
      .post(`${API}/auth/register`)
      .send({ ...person, password: 'Abcdefg1' });

    // Vérifier
    expect(sevenCharacters.status).toBe(400);
    expect(sevenCharacters.body.error.code).toBe('VALIDATION_ERROR');
    expect(sevenCharacters.body.error.details).toContainEqual(
      expect.objectContaining({
        field: 'password',
        message: 'Le mot de passe doit contenir au moins 8 caractères',
      }),
    );
    expect(eightCharacters.status).toBe(201);
    expect(eightCharacters.body.data.user.email).toBe('clea@exemple.test');
  });
});

describe('Utilisateurs — accès protégés', () => {
  test('IT-03 — liste des utilisateurs : 401 sans jeton, 403 pour un client, 200 pour un administrateur', async () => {
    // Sécurité : la gestion des utilisateurs est réservée aux administrateurs.
    // Sans jeton → 401 ; avec le jeton d'un client → 403 ; avec celui d'un administrateur → 200.

    // Préparer
    const client = await createAuthenticatedUser({ email: 'ines@exemple.test' });
    const admin = await createAuthenticatedUser({
      role: ROLES.ADMIN,
      email: 'admin.fictif@exemple.test',
    });

    // Agir
    const withoutToken = await request(app).get(`${API}/admin/users`);
    const asClient = await request(app)
      .get(`${API}/admin/users`)
      .set('Authorization', client.authHeader);
    const asAdmin = await request(app)
      .get(`${API}/admin/users`)
      .set('Authorization', admin.authHeader);

    // Vérifier
    expect(withoutToken.status).toBe(401);
    expect(withoutToken.body.error.code).toBe('AUTH_REQUIRED');
    expect(asClient.status).toBe(403);
    expect(asClient.body.error.code).toBe('FORBIDDEN');
    expect(asAdmin.status).toBe(200);
    expect(asAdmin.body.data.map((user) => user.email)).toEqual(
      expect.arrayContaining(['ines@exemple.test', 'admin.fictif@exemple.test']),
    );
  });

  test('IT-05 — compte bloqué : jeton refusé et connexion impossible, un admin ne peut pas se bloquer', async () => {
    // Sécurité : un compte bloqué par l'administrateur perd l'accès immédiatement, même avec
    // un jeton encore valide. L'administrateur ne peut pas bloquer son propre compte.

    // Préparer
    const admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
    const client = await createAuthenticatedUser({ email: 'nour@exemple.test' });

    // Agir
    const block = await request(app)
      .patch(`${API}/admin/users/${client.user.id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ isActive: false });
    const me = await request(app).get(`${API}/auth/me`).set('Authorization', client.authHeader);
    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'nour@exemple.test', password: client.password });
    const selfBlock = await request(app)
      .patch(`${API}/admin/users/${admin.user.id}/status`)
      .set('Authorization', admin.authHeader)
      .send({ isActive: false });

    // Vérifier
    expect(block.status).toBe(200);
    expect(block.body.data.isActive).toBe(false);
    expect(me.status).toBe(403);
    expect(me.body.error.code).toBe('ACCOUNT_DISABLED');
    expect(login.status).toBe(403);
    expect(login.body.error.code).toBe('ACCOUNT_DISABLED');
    expect(selfBlock.status).toBe(400);
    expect(selfBlock.body.error.code).toBe('CANNOT_MODIFY_SELF');
  });
});
