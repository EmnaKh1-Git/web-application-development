// Ligne de commande des seeders (données de démonstration) :
//   npm run db:seed          → exécute les seeders en attente
//   npm run db:seed:undo     → annule tous les seeders
//   npm run db:seed:status   → seeders appliqués / en attente
import { runDatabaseCli } from './cli.js';
import { seeder } from './migrator.js';

await runDatabaseCli(seeder, { applied: 'Seeders appliqués', pending: 'Seeders en attente' });
