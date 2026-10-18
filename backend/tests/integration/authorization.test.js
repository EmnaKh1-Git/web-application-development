import { PERMISSIONS, ROLES } from '@smart-ecommerce/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import {
  authenticate,
  errorHandler,
  requirePermission,
  requireRole,
} from '../../src/core/middlewares/index.js';
import { models } from '../../src/database/index.js';
import { createAuthenticatedUser } from '../helpers/factories.js';

// Mini-application de test : vérifie la chaîne authenticate → requirePermission / requireRole
// avec de vrais utilisateurs en base, avant que les modules métier n'existent.
const app = express();
app.get('/stock', authenticate, requirePermission(PERMISSIONS.STOCK_READ), (req, res) => {
  res.json({ role: req.user.role });
});
app.get('/admin-only', authenticate, requireRole(ROLES.ADMIN), (req, res) => {
  res.json({ role: req.user.role });
});
app.use(errorHandler);

describe('Autorisations par rôle et permission', () => {
  it.each([
    [ROLES.STOCK_MANAGER, 200],
    [ROLES.ADMIN, 200],
    [ROLES.CLIENT, 403],
  ])('stock:read — rôle %s → %i', async (role, expectedStatus) => {
    const { authHeader } = await createAuthenticatedUser({ role });

    const res = await request(app).get('/stock').set('Authorization', authHeader);

    expect(res.status).toBe(expectedStatus);
  });

  it('répond 403 FORBIDDEN au format standard quand la permission manque', async () => {
    const { authHeader } = await createAuthenticatedUser({ role: ROLES.CLIENT });

    const res = await request(app).get('/stock').set('Authorization', authHeader);

    expect(res.body).toMatchObject({ success: false, error: { code: 'FORBIDDEN' } });
  });

  it('refuse un STOCK_MANAGER sur une route réservée au rôle ADMIN', async () => {
    const { authHeader } = await createAuthenticatedUser({ role: ROLES.STOCK_MANAGER });

    const res = await request(app).get('/admin-only').set('Authorization', authHeader);

    expect(res.status).toBe(403);
  });

  it('utilise le rôle actuel en base, pas celui écrit dans le jeton', async () => {
    const { user, authHeader } = await createAuthenticatedUser({ role: ROLES.CLIENT });
    const stockManagerRole = await models.Role.findOne({ where: { name: ROLES.STOCK_MANAGER } });
    await user.update({ roleId: stockManagerRole.id });

    const res = await request(app).get('/stock').set('Authorization', authHeader);

    expect(res.status).toBe(200);
    expect(res.body.role).toBe(ROLES.STOCK_MANAGER);
  });
});
