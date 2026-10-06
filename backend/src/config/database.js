import { Sequelize } from 'sequelize';
import { logger } from '../core/utils/logger.js';
import { env } from './env.js';

/**
 * Connexion MySQL partagée par toute l'application (Sequelize).
 * Pendant les tests, la base utilisée est DB_NAME_TEST.
 */
export const sequelize = new Sequelize(env.databaseName, env.DB_USER, env.DB_PASSWORD, {
  host: env.DB_HOST,
  port: env.DB_PORT,
  dialect: 'mysql',
  logging: env.DB_LOGGING ? (sql) => logger.info(sql) : false,
  timezone: '+00:00', // dates stockées en UTC
  dialectOptions: { decimalNumbers: true }, // les DECIMAL (prix) sont lus comme des nombres
  define: {
    underscored: true, // attributs camelCase en JS ↔ colonnes snake_case en SQL (firstName ↔ first_name)
    timestamps: true, // colonnes created_at / updated_at
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
});
