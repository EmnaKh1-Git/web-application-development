/**
 * Module Produits (Emna) — tests SYSTÈME (Postman) et de CHARGE (k6).
 *
 * 1. Préparer : la base MySQL de TEST reçoit un catalogue fictif.
 * 2. L'API complète démarre sur http://localhost:4200 (mode test : base de test, IA locale).
 * 3. La collection Postman (ST-01 à ST-04) est lancée par Newman, le lanceur en ligne de
 *    commande de Postman. La même collection s'importe dans l'application Postman.
 * 4. Avec --load : le test de charge k6 (ST-05) tourne sur la même API.
 *
 * Lancement : npm run test:system -w backend   |   npm run test:load -w backend (k6 installé)
 */
// Doit rester le premier import : les variables de test sont prêtes avant la configuration de l'API.
import '../../setup/with-test-database.js';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import newman from 'newman';
import { createApp } from '../../../src/app.js';
import { env } from '../../../src/config/env.js';
import { sequelize } from '../../../src/database/index.js';
import { migrator } from '../../../src/database/migrator.js';
import { resetDatabase } from '../../helpers/database.js';
import { createTestCategory, createTestProduct } from '../../helpers/factories.js';

const PORT = 4200; // port à part : les tests de bout en bout utilisent 4100
const BASE_URL = `http://localhost:${PORT}/api/v1`;
const withLoadTest = process.argv.includes('--load');
const localFile = (name) => fileURLToPath(new URL(name, import.meta.url));

/** Catalogue fictif : deux rayons, trois produits « tennis », une rupture et un produit désactivé. */
async function prepareCatalog() {
  const mode = await createTestCategory({ name: 'Mode' });
  const sport = await createTestCategory({ name: 'Sport' });
  const products = [
    { name: 'Robe d’été fleurie', price: 89, categoryId: mode.id },
    { name: 'Chemise en lin', price: 120, categoryId: mode.id },
    { name: 'Robe de soirée', price: 280, categoryId: mode.id, quantity: 0 },
    { name: 'Veste en jean', price: 350, categoryId: mode.id },
    { name: 'Écharpe en laine', price: 25, categoryId: mode.id },
    { name: 'Lot de 3 balles de tennis', price: 18.9, categoryId: sport.id },
    { name: 'Raquette de tennis junior', price: 145, categoryId: sport.id },
    { name: 'Sac de tennis', price: 95, categoryId: sport.id },
    { name: 'Ballon de football', price: 60, categoryId: sport.id },
    { name: 'Raquette de tennis retirée', price: 50, categoryId: sport.id, isActive: false },
  ];
  for (const product of products) await createTestProduct(product);
}

/** ST-01 à ST-04 : collection Postman lancée par Newman. Résout true si tout est vert. */
function runPostmanCollection() {
  return new Promise((resolve, reject) => {
    newman.run(
      {
        collection: localFile('./products.postman_collection.json'),
        environment: localFile('./products.postman_environment.json'),
        envVar: [{ key: 'baseUrl', value: BASE_URL }],
        reporters: ['cli'],
      },
      (error, summary) =>
        error ? reject(error) : resolve(!summary.error && summary.run.failures.length === 0),
    );
  });
}

/** ST-05 : test de charge k6 (programme à installer à part). Résout true si les seuils sont tenus. */
function runLoadTest() {
  return new Promise((resolve) => {
    const k6 = spawn(
      'k6',
      ['run', '-e', `BASE_URL=${BASE_URL}`, localFile('./search-load.k6.js')],
      {
        stdio: 'inherit',
      },
    );
    k6.on('error', (error) => {
      console.error(
        error.code === 'ENOENT'
          ? 'k6 n’est pas installé. Windows : winget install k6 --source winget, puis relancez.'
          : `k6 n’a pas pu démarrer : ${error.message}`,
      );
      resolve(false);
    });
    k6.on('close', (code) => resolve(code === 0));
  });
}

async function main() {
  // Garde-fou : la base est vidée, ce doit être la base de test.
  if (!env.isTest || env.databaseName !== env.DB_NAME_TEST) {
    throw new Error('Les tests système doivent utiliser la base de test (NODE_ENV=test).');
  }
  await sequelize.authenticate();
  await migrator.up();
  await resetDatabase();
  await prepareCatalog();

  const server = await new Promise((resolve, reject) => {
    const listening = createApp().listen(PORT, (error) =>
      error ? reject(error) : resolve(listening),
    );
  });
  try {
    let success = await runPostmanCollection();
    if (withLoadTest) success = (await runLoadTest()) && success;
    process.exitCode = success ? 0 : 1;
  } finally {
    server.close();
    await sequelize.close();
  }
}

main().catch(async (error) => {
  console.error(`Tests système impossibles : ${error.message}`);
  await sequelize.close();
  process.exitCode = 1;
});
