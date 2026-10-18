import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/apiError';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from './LoginPage';

const routes = [{ path: '/login', element: <LoginPage /> }];

function renderLoginPage(login = vi.fn()) {
  renderWithProviders({ routes, initialPath: '/login', auth: { login } });
  return { login, user: userEvent.setup() };
}

describe('<LoginPage>', () => {
  it('affiche les erreurs de validation sans appeler l’API', async () => {
    const { login, user } = renderLoginPage();

    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText("L'email est obligatoire")).toBeInTheDocument();
    expect(screen.getByText('Le mot de passe est obligatoire')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('signale un email mal formé', async () => {
    const { login, user } = renderLoginPage();

    await user.type(screen.getByLabelText('Email'), 'client.test.local');
    await user.type(screen.getByLabelText('Mot de passe'), 'Motdepasse1');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByText('Adresse email invalide')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('envoie les identifiants normalisés', async () => {
    const { login, user } = renderLoginPage();

    await user.type(screen.getByLabelText('Email'), '  Client@Test.LOCAL ');
    await user.type(screen.getByLabelText('Mot de passe'), 'Motdepasse1');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(login).toHaveBeenCalledWith({ email: 'client@test.local', password: 'Motdepasse1' });
  });

  it('affiche le message de l’API en cas d’identifiants incorrects', async () => {
    const login = vi.fn().mockRejectedValue(
      new ApiError({
        status: 401,
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou mot de passe incorrect',
      }),
    );
    const { user } = renderLoginPage(login);

    await user.type(screen.getByLabelText('Email'), 'client@test.local');
    await user.type(screen.getByLabelText('Mot de passe'), 'Mauvais1');
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect');
  });
});
