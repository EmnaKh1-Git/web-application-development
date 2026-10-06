import { describe, expect, it } from 'vitest';
import {
  PERMISSIONS,
  PERMISSION_LIST,
  ROLES,
  ROLE_LIST,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  hasPermission,
} from '../src/index.js';

describe('Rôles et permissions', () => {
  it('définit exactement les rôles CLIENT, ADMIN et STOCK_MANAGER', () => {
    expect(ROLE_LIST).toEqual(['CLIENT', 'ADMIN', 'STOCK_MANAGER']);
  });

  it('associe des permissions à chaque rôle, uniquement parmi les permissions connues', () => {
    for (const role of ROLE_LIST) {
      expect(ROLE_PERMISSIONS[role].length).toBeGreaterThan(0);
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(PERMISSION_LIST).toContain(permission);
      }
    }
  });

  it('donne toutes les permissions à l’administrateur', () => {
    expect(getPermissionsForRole(ROLES.ADMIN)).toEqual(PERMISSION_LIST);
  });

  it('limite le gestionnaire de stock à la gestion du stock', () => {
    expect(hasPermission(ROLES.STOCK_MANAGER, PERMISSIONS.STOCK_MANAGE)).toBe(true);
    expect(hasPermission(ROLES.STOCK_MANAGER, PERMISSIONS.USERS_MANAGE)).toBe(false);
    expect(hasPermission(ROLES.STOCK_MANAGER, PERMISSIONS.ORDERS_PLACE)).toBe(false);
  });

  it('n’accorde aucun droit d’administration au client', () => {
    expect(hasPermission(ROLES.CLIENT, PERMISSIONS.ORDERS_PLACE)).toBe(true);
    expect(hasPermission(ROLES.CLIENT, PERMISSIONS.STOCK_READ)).toBe(false);
    expect(hasPermission(ROLES.CLIENT, PERMISSIONS.PRODUCTS_MANAGE)).toBe(false);
  });

  it('ne donne aucune permission à un rôle inconnu', () => {
    expect(getPermissionsForRole('PIRATE')).toEqual([]);
    expect(hasPermission(undefined, PERMISSIONS.CART_MANAGE)).toBe(false);
  });

  it('empêche la modification de la matrice à l’exécution', () => {
    expect(Object.isFrozen(ROLE_PERMISSIONS)).toBe(true);
    expect(Object.isFrozen(ROLE_PERMISSIONS[ROLES.CLIENT])).toBe(true);
  });
});
