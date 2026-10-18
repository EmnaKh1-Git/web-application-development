import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { vi } from 'vitest';
import { AuthContext, createAuthValue } from '@/shared/auth/AuthContext';

/** Utilisateurs de test, un par rôle. */
export const TEST_USERS = {
  CLIENT: {
    id: 1,
    firstName: 'Cléa',
    lastName: 'Client',
    email: 'client@test.local',
    role: 'CLIENT',
  },
  ADMIN: { id: 2, firstName: 'Adam', lastName: 'Admin', email: 'admin@test.local', role: 'ADMIN' },
  STOCK_MANAGER: {
    id: 3,
    firstName: 'Sami',
    lastName: 'Stock',
    email: 'stock@test.local',
    role: 'STOCK_MANAGER',
  },
};

/**
 * Affiche des routes avec une session simulée (sans appel à l'API).
 * Les appels HTTP sont simulés dans src/test/setup.js (httpClient) : chaque test
 * peut définir les réponses avec vi.mocked(httpClient.get).mockResolvedValue(...).
 *
 * @example
 * renderWithProviders({ routes, initialPath: '/admin', user: TEST_USERS.STOCK_MANAGER });
 */
export function renderWithProviders({ routes, initialPath = '/', user = null, status, auth = {} }) {
  const authValue = createAuthValue({
    user,
    status: status ?? (user ? 'authenticated' : 'anonymous'),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...auth,
  });
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <AuthContext value={authValue}>
        <RouterProvider router={router} />
      </AuthContext>
    </QueryClientProvider>,
  );
  return { ...result, router, authValue, queryClient };
}
