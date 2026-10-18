import { QueryTypes } from 'sequelize';
import { sequelize } from '../../src/database/index.js';

// Tables jamais vidées : suivi des migrations et données de référence.
const PRESERVED_TABLES = new Set(['sequelize_meta', 'sequelize_seeds', 'roles']);

/** Vide toutes les tables de la base de test (sauf les tables de référence). */
export async function resetDatabase() {
  const tables = await sequelize.query(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
    { type: QueryTypes.SELECT },
  );

  // Même connexion pour toutes les requêtes (FOREIGN_KEY_CHECKS est propre à la connexion).
  await sequelize.transaction(async (transaction) => {
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction });
    for (const { name } of tables) {
      if (!PRESERVED_TABLES.has(name)) {
        await sequelize.query(`TRUNCATE TABLE \`${name}\``, { transaction });
      }
    }
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction });
  });
}
