import { defineConfig, devices } from '@playwright/test';
import { loadTestEnv } from './backend/tests/setup/test-env.js';

/**
 * Playwright : tests de bout en bout du module Panier, commandes, livraison (Oussama).
 * Démarre une API et un front-end dédiés aux tests, sur des ports à part (4100 et 5174) :
 * l'application de développement (4000 et 5173) peut rester ouverte en même temps.
 *
 * Lancement : npm run test:e2e (MySQL démarré). Rapport : npx playwright show-report
 */
const API_PORT = 4100;
const WEB_PORT = 5174;
const API_URL = `http://localhost:${API_PORT}/api/v1`;
const WEB_URL = `http://localhost:${WEB_PORT}`;

// API en mode test : base MySQL de test, IA locale, valeurs fictives de backend/.env.test.
const apiEnv = loadTestEnv({ ...process.env }, { withDatabase: true });
Object.assign(apiEnv, { API_PORT: String(API_PORT), CORS_ORIGIN: WEB_URL });

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.js',
  fullyParallel: false,
  workers: 1, // une seule base de test partagée
  forbidOnly: Boolean(process.env.CI),
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: WEB_URL,
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node backend/src/server.js',
      url: `${API_URL}/health`,
      env: apiEnv,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `npm run dev -w frontend -- --port ${WEB_PORT} --strictPort`,
      url: WEB_URL,
      env: { ...process.env, VITE_API_URL: API_URL },
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
