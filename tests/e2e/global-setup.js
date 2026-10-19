// Doit rester le premier import : les variables de test sont prêtes avant la configuration de l'API.
import '../../backend/tests/setup/with-test-database.js';
import { ROLES } from '@smart-ecommerce/shared';
import { env } from '../../backend/src/config/env.js';
import { sequelize } from '../../backend/src/database/index.js';
import { migrator } from '../../backend/src/database/migrator.js';
import { resetDatabase } from '../../backend/tests/helpers/database.js';
import {
  createTestAddress,
  createTestCategory,
  createTestProduct,
  createTestUser,
  DEFAULT_TEST_PASSWORD,
} from '../../backend/tests/helpers/factories.js';

/**
 * Préparer (une fois avant tous les tests de bout en bout) : la base MySQL de TEST est vidée,
 * puis reçoit des données fictives : un administrateur, un client par test (avec une adresse)
 * et un petit catalogue. Les identifiants sont transmis aux tests par process.env.E2E_DATA.
 */
export default async function globalSetup() {
  // Garde-fou : la base est vidée, ce doit être la base de test.
  if (!env.isTest || env.databaseName !== env.DB_NAME_TEST) {
    throw new Error('Les tests de bout en bout doivent utiliser la base de test (NODE_ENV=test).');
  }
  await migrator.up();
  await resetDatabase();

  await createTestUser({ role: ROLES.ADMIN, email: 'admin.e2e@exemple.test' });
  const clients = {};
  for (const name of ['commande', 'stock', 'quantite', 'annulation', 'ia']) {
    const email = `client.${name}@exemple.test`;
    const { user } = await createTestUser({ email });
    const address = await createTestAddress(user.id);
    clients[name] = { email, addressId: address.id };
  }

  const mode = await createTestCategory({ name: 'Mode enfant' });
  const sport = await createTestCategory({ name: 'Sport' });
  const product = (options) => createTestProduct(options).then(({ id }) => id);
  const products = {
    robe: await product({
      name: 'Robe d’été fille',
      price: 69.9,
      quantity: 20,
      sizes: ['S', 'M', 'L'],
      colors: ['Rose', 'Blanc'],
      categoryId: mode.id,
    }),
    casquette: await product({
      name: 'Casquette de sport',
      price: 15,
      quantity: 5,
      categoryId: sport.id,
    }),
    gourde: await product({
      name: 'Gourde isotherme',
      price: 24.5,
      quantity: 4,
      categoryId: sport.id,
    }),
    chaussettes: await product({
      name: 'Chaussettes de sport',
      price: 9.9,
      quantity: 50,
      categoryId: sport.id,
    }),
    sac: await product({ name: 'Sac à dos enfant', price: 45, quantity: 10, categoryId: mode.id }),
  };
  await sequelize.close();

  process.env.E2E_DATA = JSON.stringify({
    password: DEFAULT_TEST_PASSWORD, // mot de passe fictif des comptes de test
    adminEmail: 'admin.e2e@exemple.test',
    clients,
    products,
  });
}
