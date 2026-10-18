import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api/httpClient';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';
import { ProductDetailPage } from './ProductDetailPage';

const PRODUCT = {
  id: 31,
  name: 'Robe d’été',
  description: 'Robe légère en coton.',
  price: 69.9,
  imageUrl: null,
  imageUrls: [],
  sizes: ['S', 'M'],
  colors: ['Jaune', 'Rose'],
  isActive: true,
  category: { id: 4, name: 'Mode', slug: 'mode' },
  salesCount: 3,
  rating: { average: 0, count: 0 },
  stock: { availableQuantity: 4, status: 'LOW', inStock: true },
};

const REVIEWS = {
  data: {
    summary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    viewer: { canReview: false, myReview: null },
    reviews: [],
  },
  meta: { page: 1, limit: 5, total: 0, totalPages: 0 },
};

function renderPage(user = TEST_USERS.CLIENT) {
  renderWithProviders({
    routes: [{ path: '/products/:id', element: <ProductDetailPage /> }],
    initialPath: '/products/31',
    user,
  });
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(httpClient.get).mockImplementation(async (url) => {
    if (url === '/products/31') return { data: PRODUCT };
    if (url === '/products/31/reviews') return REVIEWS;
    return { data: [], meta: { page: 1, limit: 5, total: 0, totalPages: 0 } };
  });
  vi.mocked(httpClient.post).mockResolvedValue({
    data: { items: [{ productId: 31, name: PRODUCT.name }], totalItems: 1 },
  });
});

describe('<ProductDetailPage>', () => {
  it('affiche le prix en dinars et la disponibilité', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Robe d’été' })).toBeInTheDocument();
    expect(screen.getByText(/69,90\sDT/)).toBeInTheDocument();
    expect(screen.getByText('Plus que 4 en stock')).toBeInTheDocument();
  });

  it('exige une taille et une couleur avant l’ajout au panier', async () => {
    const user = renderPage();
    const addButton = await screen.findByRole('button', { name: 'Ajouter au panier' });

    expect(addButton).toBeDisabled();
    expect(screen.getByText('Choisissez une taille pour continuer.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'M' }));
    expect(addButton).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: 'Rose' }));
    await user.click(screen.getByRole('button', { name: 'Augmenter' }));
    await user.click(addButton);

    expect(httpClient.post).toHaveBeenCalledWith('/cart/items', {
      productId: 31,
      quantity: 2,
      size: 'M',
      color: 'Rose',
    });
  });

  it('limite la quantité au stock disponible', async () => {
    const user = renderPage();
    const increase = await screen.findByRole('button', { name: 'Augmenter' });

    for (let i = 0; i < 5; i += 1) await user.click(increase);

    expect(screen.getByRole('group', { name: 'Quantité' })).toHaveTextContent('4');
    expect(increase).toBeDisabled();
  });

  it('invite un visiteur à se connecter pour commander', async () => {
    renderPage(null);

    expect(
      await screen.findByRole('link', { name: 'Se connecter pour commander' }),
    ).toBeInTheDocument();
  });
});
