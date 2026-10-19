/* global __ENV */
/**
 * Module Produits (Emna) — test de CHARGE avec k6 (ST-05).
 * 100 utilisateurs virtuels cherchent des produits en même temps pendant 1 minute.
 *
 * Préparer : API de test démarrée par run-system-tests.js --load (catalogue fictif, base de test).
 * Agir     : chaque utilisateur lance une recherche, attend 1 seconde, puis recommence.
 * Vérifier : les seuils (thresholds) — moins de 1 % d'erreurs, 95 % des réponses en moins de 500 ms.
 *
 * Lancement : npm run test:load -w backend (k6 installé : winget install k6 --source winget)
 */
import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 100,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4200/api/v1';
const SEARCHES = [
  'search=robe',
  'search=tennis&sort=price_asc',
  'search=chemise&inStock=true',
  'sort=popularity',
];

export default function searchProducts() {
  const query = SEARCHES[Math.floor(Math.random() * SEARCHES.length)];
  const response = http.get(`${BASE_URL}/products?${query}`);
  check(response, {
    'statut 200': (res) => res.status === 200,
    'liste de produits reçue': (res) => Array.isArray(res.json('data')),
  });
  sleep(1);
}
