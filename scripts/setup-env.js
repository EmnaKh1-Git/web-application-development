// Crée backend/.env et frontend/.env à partir des fichiers .env.example,
// en générant des secrets aléatoires (JWT, mots de passe MySQL et comptes de démo).
// Un fichier .env existant n'est jamais écrasé.
//
// Utilisation (à la racine du projet) : npm run setup:env
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const rootDir = fileURLToPath(new URL('..', import.meta.url));

// Mot de passe respectant la politique de l'application (minuscule, majuscule, chiffre).
const strongPassword = () => `${randomBytes(12).toString('base64url')}aA1`;

const GENERATED_VALUES = {
  JWT_SECRET: () => randomBytes(48).toString('hex'),
  DB_PASSWORD: () => randomBytes(16).toString('hex'),
  DB_ROOT_PASSWORD: () => randomBytes(16).toString('hex'),
  SEED_ADMIN_PASSWORD: strongPassword,
  SEED_STOCK_MANAGER_PASSWORD: strongPassword,
  SEED_CLIENT_PASSWORD: strongPassword,
};

function createEnvFile(folder) {
  const examplePath = `${rootDir}${folder}/.env.example`;
  const envPath = `${rootDir}${folder}/.env`;

  if (existsSync(envPath)) {
    console.log(`- ${folder}/.env existe déjà : conservé tel quel.`);
    return;
  }

  const content = readFileSync(examplePath, 'utf8')
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(/^([A-Z0-9_]+)=$/);
      const generate = match && GENERATED_VALUES[match[1]];
      return generate ? `${match[1]}=${generate()}` : line;
    })
    .join('\n');

  writeFileSync(envPath, content);
  console.log(`- ${folder}/.env créé.`);
}

createEnvFile('backend');
createEnvFile('frontend');
console.log(
  '\nLes mots de passe des comptes de démonstration sont dans backend/.env (variables SEED_*).',
);
