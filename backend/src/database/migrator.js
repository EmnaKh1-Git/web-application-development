import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SequelizeStorage, Umzug } from 'umzug';
import { env } from '../config/env.js';
import { sequelize } from './index.js';

/**
 * Migrations et seeders exécutés avec Umzug (la bibliothèque utilisée par sequelize-cli),
 * en ES Modules.
 *
 * - migrations/ : évolutions du schéma SQL (tables, colonnes, index...), table de suivi `sequelize_meta`
 * - seeders/    : données de démonstration, table de suivi `sequelize_seeds`
 *
 * Les fichiers sont exécutés dans l'ordre alphabétique : leur nom commence par un horodatage.
 */
const DATABASE_DIR = path.dirname(fileURLToPath(import.meta.url));

// Modèle utilisé par « npm run db:migration:create -- <nom>.js »
const FILE_TEMPLATE = `import { DataTypes } from 'sequelize';

// Règle d'équipe : ne modifiez JAMAIS un fichier déjà fusionné dans develop, créez-en un nouveau.

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  // Exemple :
  // await queryInterface.createTable('ma_table', {
  //   id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  //   created_at: { type: DataTypes.DATE, allowNull: false },
  //   updated_at: { type: DataTypes.DATE, allowNull: false },
  // });
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  // Exemple : await queryInterface.dropTable('ma_table');
}
`;

const EVENT_LABELS = { migrated: 'appliqué', reverted: 'annulé', created: 'créé' };

// Affichage lisible de la progression (silencieux pendant les tests).
const umzugLogger = {
  info: (message) => {
    const label = EVENT_LABELS[message.event];
    if (label && !env.isTest) console.log(`  ${label} : ${message.name ?? message.path}`);
  },
  warn: (message) => console.warn(message),
  error: (message) => console.error(message),
  debug: () => {},
};

function createUmzug({ folder, modelName, tableName }) {
  const directory = path.join(DATABASE_DIR, folder);
  return new Umzug({
    migrations: { glob: ['*.js', { cwd: directory }] },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize, modelName, tableName }),
    logger: umzugLogger,
    create: {
      folder: directory,
      template: (filePath) => [[filePath, FILE_TEMPLATE]],
    },
  });
}

export const migrator = createUmzug({
  folder: 'migrations',
  modelName: 'SequelizeMeta',
  tableName: 'sequelize_meta',
});

export const seeder = createUmzug({
  folder: 'seeders',
  modelName: 'SequelizeSeedMeta',
  tableName: 'sequelize_seeds',
});
