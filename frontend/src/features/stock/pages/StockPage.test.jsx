import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api/httpClient';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';
import { StockPage } from './StockPage';

const STOCKS = [
  {
    productId: 1,
    quantity: 0,
    lowStockThreshold: 5,
    status: 'OUT',
    updatedAt: '2026-10-10T10:00:00Z',
    product: {
      id: 1,
      name: 'Casque audio',
      price: 199,
      isActive: true,
      category: { id: 1, name: 'High-tech' },
    },
  },
  {
    productId: 2,
    quantity: 3,
    lowStockThreshold: 5,
    status: 'LOW',
    updatedAt: '2026-10-11T10:00:00Z',
    product: {
      id: 2,
      name: 'Lampe',
      price: 89.9,
      isActive: true,
      category: { id: 2, name: 'Maison' },
    },
  },
];

const API_RESPONSES = {
  '/stock/summary': { data: { totalProducts: 2, totalUnits: 3, lowStock: 1, outOfStock: 1 } },
  '/stock': { data: STOCKS, meta: { page: 1, limit: 15, total: 2, totalPages: 1 } },
  '/categories': { data: [] },
};

const routes = [{ path: '/admin/stock', element: <StockPage /> }];

beforeEach(() => {
  vi.mocked(httpClient.get).mockImplementation(async (url) => API_RESPONSES[url]);
  vi.mocked(httpClient.post).mockResolvedValue({ data: { ...STOCKS[0], quantity: 10 } });
});

describe('<StockPage> (module Stock)', () => {
  it('affiche les chiffres clés et l’état de chaque produit', async () => {
    renderWithProviders({ routes, initialPath: '/admin/stock', user: TEST_USERS.STOCK_MANAGER });

    const outRow = await screen.findByRole('row', { name: /Casque audio/ });
    expect(within(outRow).getByText('Rupture')).toBeInTheDocument();
    const lowRow = screen.getByRole('row', { name: /Lampe/ });
    expect(within(lowRow).getByText('Stock faible')).toBeInTheDocument();
    expect(screen.getByText('Unités en stock')).toBeInTheDocument();
  });

  it('filtre par état via l’API (stock faible)', async () => {
    const user = userEvent.setup();
    renderWithProviders({ routes, initialPath: '/admin/stock', user: TEST_USERS.STOCK_MANAGER });
    await screen.findByRole('row', { name: /Casque audio/ });

    await user.click(screen.getByRole('button', { name: 'Stock faible' }));

    expect(httpClient.get).toHaveBeenLastCalledWith(
      '/stock',
      expect.objectContaining({ params: expect.objectContaining({ status: 'low' }) }),
    );
  });

  it('réapprovisionne un produit et affiche le stock après l’opération', async () => {
    const user = userEvent.setup();
    renderWithProviders({ routes, initialPath: '/admin/stock', user: TEST_USERS.STOCK_MANAGER });
    await user.click(await screen.findByRole('button', { name: /Réapprovisionner Casque audio/ }));

    const dialog = screen.getByRole('dialog', { name: 'Réapprovisionner' });
    await user.type(within(dialog).getByLabelText('Quantité reçue'), '10');
    expect(within(dialog).getByText(/Après/).textContent).toContain('10');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter au stock' }));

    expect(httpClient.post).toHaveBeenCalledWith('/stock/1/add', {
      quantity: 10,
      reason: 'Livraison fournisseur',
    });
  });

  it('refuse une quantité nulle sans appeler l’API', async () => {
    const user = userEvent.setup();
    renderWithProviders({ routes, initialPath: '/admin/stock', user: TEST_USERS.STOCK_MANAGER });
    await user.click(await screen.findByRole('button', { name: /Réapprovisionner Lampe/ }));

    const dialog = screen.getByRole('dialog', { name: 'Réapprovisionner' });
    await user.type(within(dialog).getByLabelText('Quantité reçue'), '0');
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter au stock' }));

    expect(await within(dialog).findByText('La quantité doit être au moins 1')).toBeInTheDocument();
    expect(httpClient.post).not.toHaveBeenCalled();
  });
});
