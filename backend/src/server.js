import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './core/utils/logger.js';
import { sequelize } from './database/index.js';

process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', reason);
});

async function start() {
  try {
    await sequelize.authenticate();
    logger.info(`Connecté à MySQL : ${env.databaseName}@${env.DB_HOST}:${env.DB_PORT}`);
  } catch (error) {
    // ex. ECONNREFUSED (MySQL arrêté), ER_ACCESS_DENIED_ERROR (identifiants), ER_BAD_DB_ERROR (base absente)
    const reason = error.parent?.code ?? error.original?.code ?? (error.message || error.name);
    logger.error(
      `Connexion à MySQL impossible (${env.DB_HOST}:${env.DB_PORT}, base « ${env.databaseName} ») : ${reason}.\n` +
        '  MySQL est-il démarré (npm run db:up, ou WAMP/XAMPP) et backend/.env est-il correct ?',
    );
    process.exit(1);
  }

  const app = createApp();
  // Express 5 appelle ce callback AVEC une erreur si le serveur ne peut pas démarrer.
  const server = app.listen(env.PORT, (error) => {
    if (error) {
      logger.error(
        error.code === 'EADDRINUSE'
          ? `Le port ${env.PORT} est déjà utilisé : l'API tourne-t-elle déjà dans un autre terminal ? (ou changez API_PORT dans backend/.env)`
          : `Impossible de démarrer l'API : ${error.message}`,
      );
      process.exit(1);
    }
    logger.info(`API démarrée : http://localhost:${env.PORT}/api/v1`);
    if (!env.isProduction) logger.info(`Documentation : http://localhost:${env.PORT}/api/docs`);
  });

  const shutdown = async (signal) => {
    logger.info(`${signal} reçu : arrêt de l'API...`);
    server.close();
    await sequelize.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
