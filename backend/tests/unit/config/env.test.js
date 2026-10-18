import { afterEach, describe, expect, it, vi } from 'vitest';

// env.js lit process.env à l'import : on le recharge avec des variables simulées.
// Une valeur vide ('') compte comme « absente », et le fichier .env ne la remplace pas.
async function loadEnv(variables) {
  vi.resetModules();
  for (const [name, value] of Object.entries(variables)) {
    vi.stubEnv(name, value);
  }
  const { env } = await import('../../../src/config/env.js');
  return env;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Port de l’API', () => {
  it('API_PORT est prioritaire sur une variable PORT imposée par un autre outil', async () => {
    const env = await loadEnv({ API_PORT: '4000', PORT: '3000' });

    expect(env.PORT).toBe(4000);
  });

  it('utilise PORT en secours (hébergeurs qui imposent ce nom)', async () => {
    const env = await loadEnv({ API_PORT: '', PORT: '8080' });

    expect(env.PORT).toBe(8080);
  });

  it('vaut 4000 par défaut', async () => {
    const env = await loadEnv({ API_PORT: '', PORT: '' });

    expect(env.PORT).toBe(4000);
  });
});

describe('Validation de la configuration', () => {
  it('refuse de démarrer sans JWT_SECRET, avec un message explicite', async () => {
    await expect(loadEnv({ JWT_SECRET: '' })).rejects.toThrow(/JWT_SECRET est obligatoire/);
  });

  it('refuse une durée de jeton mal écrite', async () => {
    await expect(loadEnv({ JWT_EXPIRES_IN: '1 heure' })).rejects.toThrow(/JWT_EXPIRES_IN/);
  });
});
