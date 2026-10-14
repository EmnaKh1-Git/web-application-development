import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { httpClient } from '@/shared/api/httpClient';
import { renderWithProviders, TEST_USERS } from '@/test/renderWithProviders';
import { RecommendedProducts } from './RecommendedProducts';
import { ShoppingAssistant } from './ShoppingAssistant';

const product = (id, name, price) => ({
  id,
  name,
  price,
  imageUrl: null,
  description: `${name} de démonstration`,
  sizes: [],
  colors: [],
  category: { id: 1, name: 'Beauté', slug: 'beaute' },
  rating: { average: 4.5, count: 2 },
  stock: { availableQuantity: 8, status: 'OK', inStock: true },
});

describe('<ShoppingAssistant>', () => {
  it('envoie la question et affiche la réponse avec les produits proposés', async () => {
    vi.mocked(httpClient.post).mockResolvedValue({
      data: {
        reply: 'Voici quelques idées cadeaux à moins de 100 DT :',
        products: [product(7, 'Palette de fards', 49)],
        suggestions: ['Moins cher ?'],
        source: 'local',
      },
    });
    const user = userEvent.setup();
    renderWithProviders({
      routes: [{ path: '/', element: <ShoppingAssistant /> }],
      user: TEST_USERS.CLIENT,
    });

    await user.click(screen.getByRole('button', { name: 'Assistant IA' }));
    await user.type(screen.getByLabelText('Votre message'), 'Un cadeau à moins de 100 DT');
    await user.click(screen.getByRole('button', { name: 'Envoyer' }));

    expect(
      await screen.findByText('Voici quelques idées cadeaux à moins de 100 DT :'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Palette de fards/ })).toHaveAttribute(
      'href',
      '/products/7',
    );
    expect(screen.getByRole('button', { name: 'Moins cher ?' })).toBeInTheDocument();
    // Le message d'accueil (local) n'est pas envoyé : la conversation commence par le client
    expect(httpClient.post).toHaveBeenCalledWith('/ai/assistant', {
      messages: [{ role: 'user', content: 'Un cadeau à moins de 100 DT' }],
    });
  });
});

describe('<RecommendedProducts>', () => {
  it('affiche les produits recommandés avec la raison de chaque recommandation', async () => {
    vi.mocked(httpClient.get).mockResolvedValue({
      data: {
        context: 'product',
        source: 'local',
        items: [
          {
            product: product(2, 'Lot de balles de tennis', 15),
            reason: { type: 'copurchase', label: 'Souvent acheté avec « Raquette de tennis »' },
          },
        ],
      },
    });
    renderWithProviders({
      routes: [
        { path: '/', element: <RecommendedProducts productId={1} title="Vous aimerez aussi" /> },
      ],
    });

    expect(
      await screen.findByText('Souvent acheté avec « Raquette de tennis »'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Vous aimerez aussi' })).toBeInTheDocument();
    expect(httpClient.get).toHaveBeenCalledWith('/ai/recommendations', {
      params: { limit: 4, productId: 1 },
    });
  });
});
