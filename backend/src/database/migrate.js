// Ligne de commande des migrations. Utilisation (depuis la racine ou backend/) :
//   npm run db:migrate                                  → applique les migrations en attente
//   npm run db:migrate:undo                             → annule la dernière migration
//   npm run db:migrate:status                           → migrations appliquées / en attente
//   npm run db:migration:create -- create-products.js   → crée un fichier de migration
import { runDatabaseCli } from './cli.js';
import { migrator } from './migrator.js';

await runDatabaseCli(migrator, {
  applied: 'Migrations appliquées',
  pending: 'Migrations en attente',
});
