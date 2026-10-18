import { PERMISSIONS, ROLES } from '@smart-ecommerce/shared';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, UnauthorizedError } from '../../../src/core/errors/index.js';
import { requirePermission, requireRole } from '../../../src/core/middlewares/authorize.js';
import { assertOwnershipOrPermission } from '../../../src/core/security/ownership.js';

const run = (middleware, user) => {
  const next = vi.fn();
  middleware({ user }, {}, next);
  return next.mock.calls[0][0];
};

describe('requirePermission()', () => {
  const canReadStock = requirePermission(PERMISSIONS.STOCK_READ);

  it('laisse passer un rôle qui possède la permission', () => {
    expect(run(canReadStock, { id: 1, role: ROLES.STOCK_MANAGER })).toBeUndefined();
    expect(run(canReadStock, { id: 1, role: ROLES.ADMIN })).toBeUndefined();
  });

  it('refuse (403) un rôle sans la permission', () => {
    expect(run(canReadStock, { id: 1, role: ROLES.CLIENT })).toBeInstanceOf(ForbiddenError);
  });

  it('exige TOUTES les permissions demandées', () => {
    const middleware = requirePermission(PERMISSIONS.STOCK_READ, PERMISSIONS.USERS_MANAGE);
    expect(run(middleware, { id: 1, role: ROLES.STOCK_MANAGER })).toBeInstanceOf(ForbiddenError);
  });

  it('refuse (401) une requête non authentifiée', () => {
    expect(run(canReadStock, undefined)).toBeInstanceOf(UnauthorizedError);
  });

  it('détecte une permission inconnue dès la déclaration de la route', () => {
    expect(() => requirePermission('stock:lire')).toThrow(/inconnue/);
  });
});

describe('requireRole()', () => {
  it('laisse passer l’un des rôles indiqués et refuse les autres', () => {
    const backOffice = requireRole(ROLES.ADMIN, ROLES.STOCK_MANAGER);
    expect(run(backOffice, { id: 1, role: ROLES.STOCK_MANAGER })).toBeUndefined();
    expect(run(backOffice, { id: 1, role: ROLES.CLIENT })).toBeInstanceOf(ForbiddenError);
  });

  it('détecte un rôle inconnu dès la déclaration de la route', () => {
    expect(() => requireRole('SUPER_ADMIN')).toThrow(/inconnue/);
  });
});

describe('assertOwnershipOrPermission()', () => {
  it('autorise le propriétaire de la ressource', () => {
    expect(() =>
      assertOwnershipOrPermission({ id: 7, role: ROLES.CLIENT }, 7, PERMISSIONS.ORDERS_MANAGE),
    ).not.toThrow();
  });

  it('autorise un utilisateur qui possède la permission (ex. ADMIN)', () => {
    expect(() =>
      assertOwnershipOrPermission({ id: 1, role: ROLES.ADMIN }, 7, PERMISSIONS.ORDERS_MANAGE),
    ).not.toThrow();
  });

  it('refuse un autre client (protection IDOR)', () => {
    expect(() =>
      assertOwnershipOrPermission({ id: 8, role: ROLES.CLIENT }, 7, PERMISSIONS.ORDERS_MANAGE),
    ).toThrow(ForbiddenError);
  });
});
