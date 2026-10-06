/**
 * Configuration du Front-End (variables VITE_* du fichier frontend/.env).
 * Attention : tout ce qui est ici est visible dans le navigateur, donc jamais de secret.
 */
export const env = Object.freeze({
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api/v1',
});
