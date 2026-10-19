import { loadTestEnv } from './test-env.js';

// À importer EN PREMIER par les tests qui utilisent la base MySQL de test :
// les variables sont prêtes avant que le code de l'API ne lise sa configuration.
loadTestEnv(process.env, { withDatabase: true });
