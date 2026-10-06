import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

// Imposer l'import de Zod via le package partagé (messages d'erreur en français).
const restrictZodImport = [
  'error',
  {
    paths: [
      {
        name: 'zod',
        message: "Importez `z` depuis '@smart-ecommerce/shared' (messages d'erreur en français).",
      },
    ],
  },
];

export default defineConfig([
  globalIgnores(['**/node_modules', '**/dist', '**/coverage']),

  // Règles communes à tout le projet
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'object-shorthand': 'error',
    },
  },

  // Back-End, scripts et fichiers de configuration (Node.js)
  {
    files: ['backend/**/*.js', 'scripts/**/*.js', '*.config.js', 'frontend/vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['backend/**/*.js'],
    rules: { 'no-restricted-imports': restrictZodImport },
  },

  // Front-End (React)
  {
    files: ['frontend/src/**/*.{js,jsx}'],
    extends: [reactHooks.configs.flat['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: { 'no-restricted-imports': restrictZodImport },
  },
  {
    // Fichiers de définition des routes : ils exportent des tableaux, pas des composants.
    files: ['frontend/src/**/routes.jsx', 'frontend/src/app/router.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Désactive les règles de style qui entreraient en conflit avec Prettier (toujours en dernier)
  prettier,
]);
