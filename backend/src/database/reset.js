// Réinitialise la base de DÉVELOPPEMENT : annule seeders et migrations, puis les rejoue.
//   npm run db:reset
import { env } from '../config/env.js';
import { sequelize } from './index.js';
import { migrator, seeder } from './migrator.js';

if (env.isProduction) {
  console.error('db:reset est interdit en production.');
  process.exit(1);
}

try {
  console.log(`Réinitialisation de la base « ${env.databaseName} »...`);
  await seeder.down({ to: 0 });
  await migrator.down({ to: 0 });
  await migrator.up();
  await seeder.up();
  console.log('Base réinitialisée.');
} finally {
  await sequelize.close();
}
