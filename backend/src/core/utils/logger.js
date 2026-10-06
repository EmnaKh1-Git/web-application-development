import { env } from '../../config/env.js';

/**
 * Logger minimal de l'application (niveaux : error < warn < info < debug).
 * Le niveau affiché se règle avec LOG_LEVEL dans le .env.
 *
 * @example logger.info('Commande créée', { orderId: 12 });
 * @example logger.error('Échec du paiement', error);
 */
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const CONSOLE_METHODS = { error: 'error', warn: 'warn', info: 'log', debug: 'log' };

const currentLevel = LEVELS[env.LOG_LEVEL];

function log(level, message, ...details) {
  if (LEVELS[level] > currentLevel) return;
  const prefix = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)}`;
  console[CONSOLE_METHODS[level]](`${prefix} ${message}`, ...details);
}

export const logger = Object.freeze({
  error: (message, ...details) => log('error', message, ...details),
  warn: (message, ...details) => log('warn', message, ...details),
  info: (message, ...details) => log('info', message, ...details),
  debug: (message, ...details) => log('debug', message, ...details),
});
