import { expect, request } from '@playwright/test';

/** API de test démarrée par playwright.config.js (base MySQL de test). */
export const API_URL = 'http://localhost:4100/api/v1/';

/** Données fictives préparées par global-setup.js (comptes, adresses, produits). */
export const testData = JSON.parse(process.env.E2E_DATA ?? '{}');

/** Client HTTP connecté à l'API avec le compte `email` (mot de passe fictif des tests). */
export async function apiAs(email) {
  const anonymous = await request.newContext({ baseURL: API_URL });
  const login = await anonymous.post('auth/login', {
    data: { email, password: testData.password },
  });
  expect(login.status(), await login.text()).toBe(200);
  const { token } = (await login.json()).data;
  await anonymous.dispose();
  return request.newContext({
    baseURL: API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

/** Envoie la requête et renvoie le champ `data` de la réponse (échoue si l'API refuse). */
export async function send(responsePromise) {
  const response = await responsePromise;
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).data;
}

/** Ouvre une session dans le navigateur, comme un client : formulaire de connexion. */
export async function logIn(page, email) {
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(testData.password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
