import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/features/auth/api/authApi';
import { onSessionExpired } from '@/shared/api/httpClient';
import { AuthContext, createAuthValue } from './AuthContext';
import { tokenStorage } from './tokenStorage';

/** Gère la session de l'utilisateur (connexion, inscription, déconnexion, restauration). */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (tokenStorage.get() ? 'loading' : 'anonymous'));

  const startSession = useCallback(({ token, user: sessionUser }) => {
    tokenStorage.set(token);
    setUser(sessionUser);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Au chargement de l'application : restaure la session si un jeton est enregistré.
  useEffect(() => {
    if (!tokenStorage.get()) return undefined;

    let cancelled = false;
    authApi
      .me()
      .then((currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        setStatus('authenticated');
      })
      .catch(() => {
        if (!cancelled) logout();
      });
    return () => {
      cancelled = true;
    };
  }, [logout]);

  // Jeton expiré ou compte bloqué pendant la navigation : déconnexion automatique.
  useEffect(() => onSessionExpired(logout), [logout]);

  const login = useCallback(
    async (credentials) => {
      const session = await authApi.login(credentials);
      startSession(session);
      return session.user;
    },
    [startSession],
  );

  const register = useCallback(
    async (payload) => {
      const session = await authApi.register(payload);
      startSession(session);
      return session.user;
    },
    [startSession],
  );

  const value = useMemo(
    () => createAuthValue({ user, status, login, register, logout }),
    [user, status, login, register, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}
