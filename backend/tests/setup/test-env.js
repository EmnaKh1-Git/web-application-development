import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const TEST_ENV_FILE = new URL('../../.env.test', import.meta.url);
const LOCAL_ENV_FILE = new URL('../../.env', import.meta.url);
/** Seules variables reprises de backend/.env : la connexion à MySQL (jamais écrite dans .env.test). */
const CONNECTION_VARIABLES = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD'];

/**
 * Prépare les variables d'environnement des tests dans `target` (process.env).
 * - NODE_ENV vaut toujours « test » : l'API utilise alors la base DB_NAME_TEST, jamais la vraie.
 * - Les valeurs fictives de backend/.env.test complètent ce qui n'est pas déjà défini (CI, Jest).
 * - withDatabase : reprend aussi les identifiants MySQL de backend/.env, pour les tests qui
 *   utilisent la vraie base de test (intégration, acceptation, système, bout en bout).
 */
export function loadTestEnv(target, { withDatabase = false } = {}) {
  target.NODE_ENV = 'test';
  if (withDatabase && existsSync(LOCAL_ENV_FILE)) {
    const local = parseEnv(readFileSync(LOCAL_ENV_FILE, 'utf8'));
    for (const name of CONNECTION_VARIABLES) {
      if (local[name] !== undefined) target[name] ??= local[name];
    }
  }
  const values = parseEnv(readFileSync(TEST_ENV_FILE, 'utf8'));
  for (const [name, value] of Object.entries(values)) {
    target[name] ??= value;
  }
  return target;
}
