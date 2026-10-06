import { sequelize } from './index.js';

/**
 * Exécute une commande Umzug depuis le terminal (up, down, create...),
 * avec en plus une commande « status » lisible, puis ferme la connexion MySQL.
 *
 * @param {import('umzug').Umzug} umzug
 * @param {{ applied: string, pending: string }} labels titres affichés par « status »
 */
export async function runDatabaseCli(umzug, labels) {
  try {
    if (process.argv[2] === 'status') {
      await printStatus(umzug, labels);
    } else {
      await umzug.runAsCLI();
    }
  } finally {
    await sequelize.close();
  }
}

async function printStatus(umzug, labels) {
  const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()]);
  console.log(`${labels.applied} (${executed.length}) :`);
  executed.forEach(({ name }) => console.log(`  [x] ${name}`));
  console.log(`${labels.pending} (${pending.length}) :`);
  pending.forEach(({ name }) => console.log(`  [ ] ${name}`));
}
