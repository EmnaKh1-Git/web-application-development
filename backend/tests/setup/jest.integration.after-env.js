import { afterAll, beforeEach } from '@jest/globals';
import { sequelize } from '../../src/database/index.js';
import { resetDatabase } from '../helpers/database.js';

// Chaque test d'intégration Jest démarre avec une base de test vide (les rôles sont conservés).
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
