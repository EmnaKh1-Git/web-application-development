import { loadTestEnv } from './test-env.js';

/**
 * Exécuté une fois avant les tests d'intégration Jest : vérifie l'accès à la base de TEST
 * puis applique les migrations. Les variables du processus principal sont remises en l'état
 * ensuite, pour que les tests unitaires ne voient jamais les identifiants MySQL.
 */
export default async function globalSetup() {
  const originalEnv = { ...process.env };
  loadTestEnv(process.env, { withDatabase: true });
  try {
    const { env } = await import('../../src/config/env.js');
    const { sequelize } = await import('../../src/database/index.js');
    const { migrator } = await import('../../src/database/migrator.js');
    try {
      await sequelize.authenticate();
    } catch (error) {
      await sequelize.close();
      throw new Error(
        `Base de test « ${env.databaseName} » inaccessible (${error.message}).\n` +
          'Démarrez MySQL (WAMP, ou « npm run db:up ») et vérifiez backend/.env.',
        { cause: error },
      );
    }
    await migrator.up();
    await sequelize.close();
  } finally {
    for (const name of Object.keys(process.env)) {
      if (!(name in originalEnv)) delete process.env[name];
    }
    Object.assign(process.env, originalEnv);
  }
}
