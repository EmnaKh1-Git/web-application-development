import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

// Charge backend/.env.test AVANT le code testé : base de test séparée, IA locale, valeurs fictives.
// Jest donne au code testé sa propre copie de process.env : les valeurs y sont copiées ici
// (une variable déjà définie, comme NODE_ENV fixé par Jest ou une variable de la CI, est conservée).
const values = parseEnv(readFileSync(new URL('../../.env.test', import.meta.url), 'utf8'));
for (const [name, value] of Object.entries(values)) {
  process.env[name] ??= value;
}
