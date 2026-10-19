/**
 * Jest : tests imposés par le cours pour deux modules (les autres tests du Back-End tournent avec
 * Vitest, qui exclut ces dossiers dans vitest.config.js).
 * - unit        : module Stock (Yassine), base de données simulée
 * - integration : module Utilisateurs (Fares), API + base MySQL de test
 *
 * Lancement : npm run test:jest (inclus dans npm test). Un seul projet : -- --selectProjects unit
 * Le projet est en modules ES natifs : Jest tourne avec --experimental-vm-modules, sans transformation.
 */
const common = { testEnvironment: 'node', transform: {}, clearMocks: true };

export default {
  maxWorkers: 1, // une seule base de test partagée : fichiers exécutés l'un après l'autre
  projects: [
    {
      ...common,
      displayName: 'unit',
      roots: ['<rootDir>/tests/unit/stock'],
      setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
    },
    {
      ...common,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration/users'],
      globalSetup: '<rootDir>/tests/setup/jest.global-setup.js',
      setupFiles: ['<rootDir>/tests/setup/with-test-database.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.integration.after-env.js'],
    },
  ],
};
