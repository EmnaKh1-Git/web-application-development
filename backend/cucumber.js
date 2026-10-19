/**
 * Cucumber : tests d'acceptation du module Avis et réclamations (Hajer).
 * Lancement : npm run test:acceptance (MySQL démarré). Rapport HTML : reports/acceptance.html
 */
export default {
  paths: ['tests/acceptance/**/*.feature'],
  import: ['tests/acceptance/support/**/*.js', 'tests/acceptance/**/steps/**/*.js'],
  language: 'fr',
  format: ['progress', 'html:reports/acceptance.html'],
};
