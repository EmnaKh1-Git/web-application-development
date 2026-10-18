import { afterAll, beforeEach } from 'vitest';
import { sequelize } from '../../src/database/index.js';
import { resetDatabase } from '../helpers/database.js';

// Chaque test démarre avec une base vide (les rôles sont conservés).
beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
