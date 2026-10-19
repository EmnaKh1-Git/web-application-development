import { configDefaults, defineConfig } from 'vitest/config';

// Valeurs réservées aux tests automatisés (ce ne sont pas des secrets réels).
const TEST_JWT_SECRET = 'jwt-secret-reserve-aux-tests-automatises-0123456789';

export default defineConfig({
  test: {
    environment: 'node',
    projects: [
      {
        extends: true,
        test: {
          // Tests unitaires : aucune base de données nécessaire
          name: 'unit',
          include: ['tests/unit/**/*.test.js'],
          // Module Stock : tests unitaires écrits avec Jest (jest.config.js), lancés par « npm run test:jest »
          exclude: [...configDefaults.exclude, 'tests/unit/stock/**'],
          env: {
            NODE_ENV: 'test',
            JWT_SECRET: TEST_JWT_SECRET,
            BCRYPT_SALT_ROUNDS: '4',
            DB_NAME: 'unit_tests_sans_bdd',
            DB_NAME_TEST: 'unit_tests_sans_bdd_test',
            DB_USER: 'unit_tests',
          },
        },
      },
      {
        extends: true,
        test: {
          // Tests d'intégration : API complète + base MySQL de test (DB_NAME_TEST du .env)
          name: 'integration',
          include: ['tests/integration/**/*.test.js'],
          // Module Utilisateurs : tests d'intégration écrits avec Jest + Supertest (jest.config.js)
          exclude: [...configDefaults.exclude, 'tests/integration/users/**'],
          env: { NODE_ENV: 'test', JWT_SECRET: TEST_JWT_SECRET, BCRYPT_SALT_ROUNDS: '4' },
          globalSetup: ['tests/setup/integration.global-setup.js'],
          setupFiles: ['tests/setup/integration.setup.js'],
          fileParallelism: false, // une seule base de test partagée : fichiers exécutés l'un après l'autre
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/server.js', 'src/database/**'],
    },
  },
});
