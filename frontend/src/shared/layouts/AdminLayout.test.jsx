import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { routes } from '@/app/router';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';

const sidebarLinks = () =>
  within(screen.getByRole('navigation', { name: 'Back-office' }))
    .getAllByRole('link')
    .map((link) => link.textContent);

describe('Back-office', () => {
  it('ne montre au STOCK_MANAGER que la section Stock', () => {
    renderWithProviders({ routes, initialPath: '/admin', user: TEST_USERS.STOCK_MANAGER });

    expect(sidebarLinks()).toEqual(['Tableau de bord', 'Stock']);
  });

  it('montre toutes les sections à l’ADMIN', () => {
    renderWithProviders({ routes, initialPath: '/admin', user: TEST_USERS.ADMIN });

    expect(sidebarLinks()).toEqual([
      'Tableau de bord',
      'Utilisateurs',
      'Produits',
      'Catégories',
      'Commandes',
      'Réclamations',
      'Stock',
    ]);
  });

  it('refuse l’accès au CLIENT', () => {
    renderWithProviders({ routes, initialPath: '/admin', user: TEST_USERS.CLIENT });

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
  });

  it('refuse au STOCK_MANAGER une page du back-office hors de ses permissions', () => {
    renderWithProviders({ routes, initialPath: '/admin/users', user: TEST_USERS.STOCK_MANAGER });

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
  });
});
