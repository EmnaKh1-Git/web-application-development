import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api/httpClient';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';
import { AdminOrdersPage } from './AdminOrdersPage';

const order = (status) => ({
  id: 7,
  status,
  totalAmount: 139.8,
  itemsCount: 2,
  items: [
    {
      id: 1,
      productId: 31,
      productName: 'Robe d’été',
      imageUrl: null,
      unitPrice: 69.9,
      quantity: 2,
      size: 'M',
      color: 'Rose',
      lineTotal: 139.8,
    },
  ],
  shippingAddress: {
    recipient: 'Cléa Client',
    street: '1 rue',
    city: 'Tunis',
    postalCode: '1001',
    country: 'Tunisie',
  },
  delivery: { status: 'PENDING' },
  customer: { id: 1, firstName: 'Cléa', lastName: 'Client', email: 'client@test.local' },
  canCancel: true,
  createdAt: '2026-10-13T10:00:00Z',
  updatedAt: '2026-10-13T10:00:00Z',
});

const STATS = {
  totalOrders: 1,
  revenue: 0,
  byStatus: { PENDING: 1, CONFIRMED: 0, SHIPPED: 0, DELIVERED: 0, CANCELLED: 0 },
};

function renderPage(status) {
  vi.mocked(httpClient.get).mockImplementation(async (url) =>
    url === '/admin/orders/stats'
      ? { data: STATS }
      : { data: [order(status)], meta: { page: 1, limit: 15, total: 1, totalPages: 1 } },
  );
  renderWithProviders({
    routes: [{ path: '/admin/orders', element: <AdminOrdersPage /> }],
    initialPath: '/admin/orders',
    user: TEST_USERS.ADMIN,
  });
  return userEvent.setup();
}

async function openOrder(user) {
  await user.click(await screen.findByRole('button', { name: /Gérer/ }));
  return screen.getByRole('dialog', { name: 'Commande n°7' });
}

beforeEach(() => {
  vi.mocked(httpClient.patch).mockResolvedValue({ data: order('CONFIRMED') });
});

describe('<AdminOrdersPage>', () => {
  it('affiche le client et la variante commandée', async () => {
    const user = renderPage('PENDING');
    const dialog = await openOrder(user);

    expect(within(dialog).getByText('client@test.local')).toBeInTheDocument();
    expect(within(dialog).getByText('Taille M · Couleur Rose')).toBeInTheDocument();
  });

  it('ne propose que les transitions autorisées (en attente → confirmer ou annuler)', async () => {
    const user = renderPage('PENDING');
    const dialog = await openOrder(user);

    expect(
      within(dialog).getByRole('button', { name: 'Confirmer la commande' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Annuler la commande' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Marquer comme livrée' })).toBeNull();
  });

  it('confirme la commande (le stock est déduit côté serveur)', async () => {
    const user = renderPage('PENDING');
    const dialog = await openOrder(user);

    await user.click(within(dialog).getByRole('button', { name: 'Confirmer la commande' }));

    expect(httpClient.patch).toHaveBeenCalledWith('/admin/orders/7/status', {
      status: 'CONFIRMED',
    });
    expect(
      await within(dialog).findByRole('button', { name: 'Marquer comme expédiée' }),
    ).toBeInTheDocument();
  });

  it('demande une confirmation avant d’annuler', async () => {
    const user = renderPage('PENDING');
    const dialog = await openOrder(user);

    await user.click(within(dialog).getByRole('button', { name: 'Annuler la commande' }));

    expect(screen.getByRole('dialog', { name: 'Annuler la commande n°7 ?' })).toBeInTheDocument();
    expect(httpClient.patch).not.toHaveBeenCalled();
  });

  it('ne propose plus aucune action sur une commande livrée', async () => {
    const user = renderPage('DELIVERED');
    const dialog = await openOrder(user);

    expect(within(dialog).queryByRole('region', { name: 'Changer le statut' })).toBeNull();
    expect(within(dialog).queryByRole('button', { name: /Annuler/ })).toBeNull();
  });
});
