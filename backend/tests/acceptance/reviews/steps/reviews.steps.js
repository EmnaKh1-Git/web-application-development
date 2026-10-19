// Doit rester le premier import : les variables de test sont prêtes avant la configuration de l'API.
import '../../../setup/with-test-database.js';
import assert from 'node:assert/strict';
import { Given, Then, When } from '@cucumber/cucumber';
import { COMPLAINT_STATUS_LABELS, ROLES } from '@smart-ecommerce/shared';
import { isClaudeEnabled } from '../../../../src/modules/ai/llm/claude.js';
import { createAuthenticatedUser, createTestProduct } from '../../../helpers/factories.js';
import { deliveredBy, placeOrder } from '../../../helpers/orders.js';

/*
 * Étapes du module Avis et réclamations (Hajer).
 * Chaque phrase du fichier .feature est reliée ici à une action sur l'API ou à une vérification.
 */

/** « Résolue » → RESOLVED (libellés affichés à l'utilisateur). */
function complaintStatusFromLabel(label) {
  const entry = Object.entries(COMPLAINT_STATUS_LABELS).find(([, text]) => text === label);
  assert.ok(entry, `Statut de réclamation inconnu : « ${label} »`);
  return entry[0];
}

/* ───────────── Étant donné (Préparer) ───────────── */

Given('le produit {texte} au catalogue', async function (name) {
  this.admin = await createAuthenticatedUser({ role: ROLES.ADMIN });
  this.product = await createTestProduct({ name, price: 18.9, quantity: 20 });
});

Given('une cliente {texte} dont la commande du produit est livrée', async function (firstName) {
  this.client = await this.newClient(firstName);
  await placeOrder(this.app, this.client, [{ productId: this.product.id, quantity: 1 }], {
    statuses: deliveredBy(this.admin),
  });
});

Given('une cliente {texte} dont la commande du produit est en attente', async function (firstName) {
  this.client = await this.newClient(firstName);
  await placeOrder(this.app, this.client, [{ productId: this.product.id, quantity: 1 }]);
});

Given(
  'une cliente {texte} ayant déposé la réclamation {texte}',
  async function (firstName, subject) {
    this.client = await this.newClient(firstName);
    const order = await placeOrder(this.app, this.client, [
      { productId: this.product.id, quantity: 1 },
    ]);
    const res = await this.api('post', '/complaints', this.client).send({
      subject,
      description: 'Le flacon est arrivé cassé dans le colis et le parfum a coulé.',
      orderId: order.id,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    this.complaint = res.body.data;
  },
);

Given('le produit a reçu ces avis de clients livrés :', async function (table) {
  for (const [index, row] of table.hashes().entries()) {
    const client = await this.newClient(`Client${index + 1}`);
    await placeOrder(this.app, client, [{ productId: this.product.id, quantity: 1 }], {
      statuses: deliveredBy(this.admin),
    });
    const res = await this.api('post', `/products/${this.product.id}/reviews`, client).send({
      rating: Number(row.note),
      comment: row.commentaire,
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
  }
});

Given("l'IA externe Claude est indisponible", function () {
  // Simulation de la panne : en test, Claude est coupé par la configuration
  // (AI_PROVIDER=local, aucune clé dans backend/.env.test). Aucun appel réseau n'est possible.
  assert.equal(isClaudeEnabled(), false, 'Claude ne doit jamais être appelé pendant les tests');
});

/* ───────────── Quand (Agir) ───────────── */

When('elle publie un avis {int} étoiles : {texte}', async function (rating, comment) {
  this.response = await this.api('post', `/products/${this.product.id}/reviews`, this.client).send({
    rating,
    comment,
  });
});

When("l'administrateur la passe à {texte} sans réponse", async function (label) {
  this.response = await this.api(
    'patch',
    `/admin/complaints/${this.complaint.id}`,
    this.admin,
  ).send({ status: complaintStatusFromLabel(label) });
});

When(
  "l'administrateur la passe à {texte} avec la réponse {texte}",
  async function (label, adminResponse) {
    this.response = await this.api(
      'patch',
      `/admin/complaints/${this.complaint.id}`,
      this.admin,
    ).send({ status: complaintStatusFromLabel(label), adminResponse });
  },
);

When('un visiteur demande le résumé des avis du produit', async function () {
  this.response = await this.api('get', `/ai/products/${this.product.id}/reviews-summary`);
});

/* ───────────── Alors (Vérifier) ───────────── */

Then("l'avis est publié", function () {
  assert.equal(this.response.status, 201, this.describeResponse());
});

Then("l'avis est refusé avec le message {texte}", function (message) {
  assert.ok(this.response.status >= 400, this.describeResponse());
  assert.ok(this.errorMessages().includes(message), this.describeResponse());
});

Then('la clôture est refusée avec le message {texte}', function (message) {
  assert.equal(this.response.status, 400, this.describeResponse());
  assert.ok(this.errorMessages().includes(message), this.describeResponse());
});

Then('la note moyenne du produit est {int} sur {int} avis', async function (average, count) {
  const res = await this.api('get', `/products/${this.product.id}`);
  assert.deepEqual(res.body.data.rating, { average, count });
});

Then("le produit n'a toujours aucun avis", async function () {
  const res = await this.api('get', `/products/${this.product.id}`);
  assert.equal(res.body.data.rating.count, 0);
});

Then(
  'la cliente voit sa réclamation {texte} avec la réponse {texte}',
  async function (label, adminResponse) {
    const res = await this.api('get', `/complaints/${this.complaint.id}`, this.client);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, complaintStatusFromLabel(label));
    assert.equal(res.body.data.adminResponse, adminResponse);
  },
);

Then("un résumé de {int} avis est produit par l'IA locale", function (count) {
  assert.equal(this.response.status, 200, this.describeResponse());
  const summary = this.response.body.data;
  assert.equal(summary.available, true);
  assert.equal(summary.count, count);
  assert.equal(summary.source, 'local');
  assert.match(summary.summary, new RegExp(`${count} avis`));
});

Then('la note moyenne du résumé est {nombre} sur 5', function (average) {
  assert.equal(this.response.body.data.average, average);
});
