// Doit rester le premier import : les variables de test sont prêtes avant la configuration de l'API.
import '../../setup/with-test-database.js';
import {
  AfterAll,
  Before,
  BeforeAll,
  defineParameterType,
  setDefaultTimeout,
  setWorldConstructor,
  World,
} from '@cucumber/cucumber';
import request from 'supertest';
import { createApp } from '../../../src/app.js';
import { env } from '../../../src/config/env.js';
import { sequelize } from '../../../src/database/index.js';
import { migrator } from '../../../src/database/migrator.js';
import { resetDatabase } from '../../helpers/database.js';
import { createAuthenticatedUser } from '../../helpers/factories.js';

/*
 * Support des tests d'acceptation (Cucumber) : API complète en mémoire (Supertest),
 * base MySQL de TEST reconstruite par les migrations et vidée avant chaque scénario.
 */

setDefaultTimeout(30_000);
const apiApp = createApp();

// Texte entre guillemets français : « ... »
defineParameterType({ name: 'texte', regexp: /« ([^»]*) »/, transformer: (text) => text });
// Nombre écrit à la française : 3,7
defineParameterType({
  name: 'nombre',
  regexp: /\d+(?:,\d+)?/,
  transformer: (value) => Number(value.replace(',', '.')),
});

class AcceptanceWorld extends World {
  app = apiApp;

  /** Requête à l'API (/api/v1), avec le jeton de `user` s'il est fourni. */
  api(method, path, user) {
    const pending = request(this.app)[method](`/api/v1${path}`);
    return user ? pending.set('Authorization', user.authHeader) : pending;
  }

  /** Client fictif connecté (email en @exemple.test). */
  async newClient(firstName) {
    const client = await createAuthenticatedUser({
      email: `${firstName.toLowerCase()}.${Date.now()}@exemple.test`,
    });
    await client.user.update({ firstName });
    return client;
  }

  /** Messages d'erreur de la dernière réponse : message principal et détail par champ. */
  errorMessages() {
    const error = this.response.body.error ?? {};
    return [error.message, ...(error.details ?? []).map((detail) => detail.message)];
  }

  /** Résumé de la dernière réponse, affiché quand une vérification échoue. */
  describeResponse() {
    return `Réponse ${this.response.status} : ${JSON.stringify(this.response.body)}`;
  }
}

setWorldConstructor(AcceptanceWorld);

BeforeAll(async () => {
  // Garde-fou : les scénarios vident la base, ce doit être la base de test.
  if (!env.isTest || env.databaseName !== env.DB_NAME_TEST) {
    throw new Error('Les tests d’acceptation doivent utiliser la base de test (NODE_ENV=test).');
  }
  try {
    await sequelize.authenticate();
  } catch (error) {
    throw new Error(
      `Base de test « ${env.databaseName} » inaccessible (${error.message}). Démarrez MySQL (WAMP).`,
      { cause: error },
    );
  }
  await migrator.up();
});

Before(async () => {
  await resetDatabase();
});

AfterAll(async () => {
  await sequelize.close();
});
