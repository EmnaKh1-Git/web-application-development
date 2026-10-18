// Stockage du jeton JWT dans le navigateur (localStorage).
// Limite connue : un script injecté (XSS) pourrait le lire. On ne doit donc jamais
// afficher de HTML non maîtrisé (pas de dangerouslySetInnerHTML avec des données utilisateur).
const TOKEN_KEY = 'smart-ecommerce.token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null; // stockage indisponible (navigation privée stricte...)
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      // stockage indisponible : la session ne durera que le temps de la page
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      // rien à nettoyer
    }
  },
};
