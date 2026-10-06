// Exécuté une fois avant tous les tests d'intégration :
// vérifie l'accès à la base de TEST puis la reconstruit avec les migrations.
export async function setup() {
  process.env.NODE_ENV = 'test';

  const { env } = await import('../../src/config/env.js');
  const { sequelize } = await import('../../src/database/index.js');
  const { migrator } = await import('../../src/database/migrator.js');

  try {
    await sequelize.authenticate();
  } catch (error) {
    await sequelize.close();
    throw new Error(
      `Base de test « ${env.databaseName} » inaccessible (${error.message}).\n` +
        'Démarrez MySQL avec « npm run db:up » et vérifiez DB_NAME_TEST dans backend/.env.',
      { cause: error },
    );
  }

  // Schéma reconstruit à chaque exécution : vérifie aussi que les « down » des migrations fonctionnent.
  await migrator.down({ to: 0 });
  await migrator.up();
  await sequelize.close();
}
