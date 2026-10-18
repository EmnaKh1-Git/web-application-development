import { env } from '../../config/env.js';

/*
 * Cache mémoire des calculs coûteux du module IA (modèles de prévision, de recommandation...).
 * Les entrées sont invalidées par les événements métier (commande confirmée, avis modifié...)
 * ou expirent après leur durée de vie. Désactivé pendant les tests (résultats toujours frais).
 */

const store = new Map();

/** Résultat de `compute()` gardé `ttlMs` millisecondes (les appels simultanés partagent le calcul). */
export function cached(key, ttlMs, compute) {
  if (env.isTest) return compute();
  const entry = store.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.promise;

  const promise = Promise.resolve().then(compute);
  store.set(key, { promise, expiresAt: Date.now() + ttlMs });
  promise.catch(() => store.delete(key));
  return promise;
}

/** Supprime les entrées dont la clé commence par l'un des préfixes. */
export function invalidateCache(...prefixes) {
  for (const key of store.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) store.delete(key);
  }
}
