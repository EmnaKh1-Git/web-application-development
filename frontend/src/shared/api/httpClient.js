import axios from 'axios';
import { env } from '@/config/env';
import { tokenStorage } from '@/shared/auth/tokenStorage';
import { toApiError } from './apiError';

/**
 * Client HTTP unique pour appeler l'API (à utiliser dans les fichiers features/<module>/api/).
 * - ajoute automatiquement le jeton JWT ;
 * - renvoie directement le corps de la réponse : { success, data, meta } ;
 * - transforme toute erreur en ApiError { status, code, message, details }.
 *
 * @example
 * const { data, meta } = await httpClient.get('/products', { params: { page: 1 } });
 */
export const httpClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

httpClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const sessionExpiredListeners = new Set();

/**
 * Être prévenu quand la session n'est plus valide (jeton expiré, compte bloqué).
 * Utilisé par AuthProvider pour déconnecter l'utilisateur. Retourne la fonction de désabonnement.
 */
export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

httpClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const apiError = toApiError(error);
    const hadSession = Boolean(error.config?.headers?.Authorization);
    const sessionInvalid =
      apiError.status === 401 || (apiError.status === 403 && apiError.code === 'ACCOUNT_DISABLED');

    if (hadSession && sessionInvalid) {
      sessionExpiredListeners.forEach((listener) => listener(apiError));
    }
    return Promise.reject(apiError);
  },
);
