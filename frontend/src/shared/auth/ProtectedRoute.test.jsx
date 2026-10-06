import { PERMISSIONS } from '@smart-ecommerce/shared';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';
import { ProtectedRoute } from './ProtectedRoute';

const routes = [
  { path: '/login', element: <p>Page de connexion</p> },
  {
    path: '/stock',
    element: (
      <ProtectedRoute permissions={[PERMISSIONS.STOCK_READ]}>
        <p>Contenu du stock</p>
      </ProtectedRoute>
    ),
  },
];

describe('<ProtectedRoute>', () => {
  it('redirige un visiteur non connecté vers /login', () => {
    const { router } = renderWithProviders({ routes, initialPath: '/stock' });

    expect(screen.getByText('Page de connexion')).toBeInTheDocument();
    expect(router.state.location.state.from.pathname).toBe('/stock');
  });

  it('affiche « Accès refusé » si la permission manque (CLIENT)', () => {
    renderWithProviders({ routes, initialPath: '/stock', user: TEST_USERS.CLIENT });

    expect(screen.getByRole('heading', { name: 'Accès refusé' })).toBeInTheDocument();
    expect(screen.queryByText('Contenu du stock')).not.toBeInTheDocument();
  });

  it.each(['STOCK_MANAGER', 'ADMIN'])('affiche la page pour le rôle %s', (role) => {
    renderWithProviders({ routes, initialPath: '/stock', user: TEST_USERS[role] });

    expect(screen.getByText('Contenu du stock')).toBeInTheDocument();
  });

  it('affiche un indicateur de chargement pendant la vérification de la session', () => {
    renderWithProviders({ routes, initialPath: '/stock', status: 'loading' });

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
