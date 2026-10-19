/**
 * Jest : tests unitaires du module Stock (type de test imposé par le cours pour ce module).
 * Les autres tests du Back-End tournent avec Vitest (vitest.config.js exclut ce dossier).
 * Lancement : npm run test:jest (inclus dans npm test et npm run test:unit).
 *
 * Le projet est en modules ES natifs : Jest tourne avec --experimental-vm-modules, sans transformation.
 */
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/unit/stock'],
  testMatch: ['**/*.test.js'],
  transform: {},
  setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
  clearMocks: true,
};
