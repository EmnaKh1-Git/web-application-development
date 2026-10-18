import { httpClient } from '@/shared/api/httpClient';

/** Appels à l'API d'authentification (module de Fares). */
export const authApi = {
  /** @returns {Promise<{ token: string, user: object }>} */
  async login(credentials) {
    const { data } = await httpClient.post('/auth/login', credentials);
    return data;
  },

  /** @returns {Promise<{ token: string, user: object }>} */
  async register(payload) {
    const { data } = await httpClient.post('/auth/register', payload);
    return data;
  },

  /** Utilisateur correspondant au jeton enregistré. */
  async me() {
    const { data } = await httpClient.get('/auth/me');
    return data;
  },
};
