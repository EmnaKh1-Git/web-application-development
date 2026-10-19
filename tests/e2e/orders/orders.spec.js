/**
 * Module Panier, commandes, livraison (Oussama) — tests de BOUT EN BOUT avec Playwright.
 *
 * Un vrai navigateur parcourt l'application complète (front-end React + API + base MySQL de
 * TEST) comme un client, clic après clic. Données fictives préparées par global-setup.js.
 * L'IA est simulée en interceptant ses appels réseau. Pattern AAA : Préparer → Agir → Vérifier.
 *
 * Lancement : npm run test:e2e (MySQL démarré)
 */
import { expect, test } from '@playwright/test';
import { apiAs, API_URL, logIn, send, testData } from '../support/api.js';

const { clients, products } = testData;
const orderButton = (page) => page.getByRole('button', { name: /^Commander/ });

/** Passe une commande par l'API (panier → commande) : préparation rapide d'un test. */
async function placeOrder(api, productId, addressId) {
  await send(api.post('cart/items', { data: { productId, quantity: 1 } }));
  return send(api.post('orders', { data: { addressId } }));
}

test('E2E-01 — commande complète : de la fiche produit au suivi de la commande', async ({
  page,
}) => {
  // Scénario nominal : le client choisit taille, couleur et quantité, ajoute au panier, commande.
  // La commande est « En attente » avec le bon total (2 × 69,90 = 139,80 DT) et le panier est vidé.

  // Préparer
  await logIn(page, clients.commande.email);

  // Agir
  await page.goto(`/products/${products.robe}`);
  await page.getByRole('group', { name: 'Taille' }).getByText('M', { exact: true }).click();
  await page.getByRole('group', { name: 'Couleur' }).getByText('Rose', { exact: true }).click();
  await page
    .getByRole('group', { name: 'Quantité' })
    .getByRole('button', { name: 'Augmenter' })
    .click();
  await page.getByRole('button', { name: 'Ajouter au panier' }).click();
  await expect(page.getByText('Ajouté au panier')).toBeVisible();
  await page.getByRole('link', { name: 'Panier (2 articles)' }).click();
  await orderButton(page).click();

  // Vérifier
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  const orderId = page.url().split('/').pop();
  await expect(
    page.getByRole('heading', { level: 1, name: `Commande n°${orderId}` }),
  ).toBeVisible();
  await expect(page.getByText('En attente', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('139,80').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Panier', exact: true })).toBeVisible(); // badge vide
  await page.getByRole('link', { name: 'Mes commandes' }).first().click();
  await expect(page.getByRole('heading', { name: `Commande n°${orderId}` })).toBeVisible();
});

test('E2E-02 — stock devenu insuffisant juste avant de commander : commande refusée', async ({
  page,
}) => {
  // Cas d'erreur : 3 casquettes au panier, mais le stock passe à 1 pendant que le client
  // regarde son panier. Le clic sur « Commander » est refusé et aucune commande n'est créée.

  // Préparer
  const client = await apiAs(clients.stock.email);
  const admin = await apiAs(testData.adminEmail);
  await send(client.post('cart/items', { data: { productId: products.casquette, quantity: 3 } }));
  await logIn(page, clients.stock.email);
  await page.goto('/cart');
  await expect(orderButton(page)).toBeEnabled();
  await send(admin.patch(`stock/${products.casquette}`, { data: { quantity: 1 } })); // back-office

  // Agir
  await orderButton(page).click();

  // Vérifier
  await expect(
    page.getByText('Certains articles de votre panier ne sont plus disponibles'),
  ).toBeVisible();
  await expect(page.getByText('Stock insuffisant : 1 disponible(s) pour ce produit')).toBeVisible();
  await expect(orderButton(page)).toBeDisabled();
  await expect(page).toHaveURL(/\/cart$/);
  expect(await send(client.get('orders'))).toHaveLength(0);
});

test('E2E-03 — quantité bornée : 4 en stock, et jamais plus de 20 par article', async ({
  page,
}) => {
  // Cas limite : le bouton « + » s'arrête exactement au stock disponible (4),
  // et au maximum autorisé par article (20) quand le stock est plus grand (50).

  // Préparer
  await logIn(page, clients.quantite.email);
  const stepper = page.getByRole('group', { name: 'Quantité' });
  const increase = stepper.getByRole('button', { name: 'Augmenter' });

  // Agir : gourde, 4 en stock
  await page.goto(`/products/${products.gourde}`);
  for (let click = 0; click < 3; click += 1) await increase.click();

  // Vérifier
  await expect(stepper.locator('output')).toHaveText('4');
  await expect(increase).toBeDisabled();

  // Agir : chaussettes, 50 en stock
  await page.goto(`/products/${products.chaussettes}`);
  for (let click = 0; click < 19; click += 1) await increase.click();

  // Vérifier
  await expect(stepper.locator('output')).toHaveText('20');
  await expect(increase).toBeDisabled();
});

test('E2E-04 — annuler une commande en attente ; une commande expédiée ne s’annule plus', async ({
  page,
}) => {
  // Cas nominal + cas d'erreur : le client annule sa commande en attente (après confirmation).
  // Une commande déjà expédiée affiche son suivi (transporteur, numéro) et n'est plus annulable.

  // Préparer
  const client = await apiAs(clients.annulation.email);
  const admin = await apiAs(testData.adminEmail);
  const pending = await placeOrder(client, products.sac, clients.annulation.addressId);
  const shipped = await placeOrder(client, products.sac, clients.annulation.addressId);
  for (const status of ['CONFIRMED', 'SHIPPED']) {
    await send(admin.patch(`admin/orders/${shipped.id}/status`, { data: { status } }));
  }
  await logIn(page, clients.annulation.email);

  // Agir : annuler la commande en attente
  await page.goto(`/orders/${pending.id}`);
  await page.getByRole('button', { name: 'Annuler la commande' }).click();
  await page
    .getByRole('dialog', { name: `Annuler la commande n°${pending.id} ?` })
    .getByRole('button', { name: 'Oui, annuler' })
    .click();

  // Vérifier
  await expect(page.getByText('Annulée', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler la commande' })).toHaveCount(0);

  // Agir : ouvrir la commande expédiée
  await page.goto(`/orders/${shipped.id}`);

  // Vérifier
  await expect(page.getByText('Expédiée', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Transporteur')).toBeVisible();
  await expect(page.getByText(/^SE-/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler la commande' })).toHaveCount(0);
});

test('E2E-05 — recommandations du panier : IA simulée, puis IA indisponible sans bloquer l’achat', async ({
  page,
}) => {
  // IA simulée : les appels à /ai/recommendations sont interceptés et reçoivent une réponse fixe
  // (2 produits du catalogue). Puis l'IA tombe en panne (503) : la section disparaît,
  // mais le client commande normalement.

  // Préparer
  const client = await apiAs(clients.ia.email);
  await send(client.post('cart/items', { data: { productId: products.chaussettes, quantity: 1 } }));
  const recommended = await Promise.all(
    [products.gourde, products.sac].map((id) => send(client.get(`products/${id}`))),
  );
  const recommendations = `${API_URL}ai/recommendations**`;
  await page.route(recommendations, (route) =>
    route.fulfill({
      json: {
        success: true,
        data: {
          source: 'local',
          items: recommended.map((product) => ({
            product,
            reason: { label: 'Souvent acheté avec Chaussettes de sport' },
          })),
        },
      },
    }),
  );
  await logIn(page, clients.ia.email);

  // Agir
  await page.goto('/cart');

  // Vérifier
  const section = page.getByRole('region', { name: 'Complétez votre panier' });
  await expect(section).toBeVisible();
  await expect(section.getByRole('link', { name: 'Gourde isotherme' })).toBeVisible();
  await expect(section.getByText('Souvent acheté avec Chaussettes de sport').first()).toBeVisible();

  // Préparer : l'IA devient indisponible
  let failedCalls = 0;
  await page.unroute(recommendations);
  await page.route(recommendations, (route) => {
    failedCalls += 1;
    return route.fulfill({
      status: 503,
      json: { success: false, error: { code: 'AI_UNAVAILABLE', message: 'IA indisponible' } },
    });
  });

  // Agir
  await page.reload();

  // Vérifier : la section disparaît, le panier reste affiché
  await expect(page.getByRole('heading', { name: 'Mon panier' })).toBeVisible();
  await expect(section).toHaveCount(0);
  expect(failedCalls).toBeGreaterThan(0);

  // Agir
  await orderButton(page).click();

  // Vérifier : la commande passe normalement
  await expect(page).toHaveURL(/\/orders\/\d+$/);
  await expect(page.getByText('En attente', { exact: true }).first()).toBeVisible();
});
