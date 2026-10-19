# Architecture technique

## 1. Vue d'ensemble

```
┌──────────────────────────┐
│  Front-End React (SPA)   │  React Router · Axios (httpClient) · AuthProvider · Tailwind
└────────────┬─────────────┘
             │ HTTP/JSON — Authorization: Bearer <JWT>
             ▼
┌───────────────────────────────────────────────────────────────────┐
│ Back-End Node.js / Express 5 — /api/v1                            │
│ helmet · cors · rate-limit · authenticate · requirePermission ·   │
│ validate(Zod) · errorHandler                                      │
│ ┌──────┐┌───────┐┌─────────┐┌────────┐┌─────────┐┌───────┐┌────┐ │
│ │ auth ││ users ││products ││ orders ││ reviews ││ stock ││ ai │ │
│ └──────┘└───────┘└─────────┘└────────┘└─────────┘└───────┘└─┬──┘ │
│              services ↔ modèles Sequelize                   │    │
└────────────────────────┬────────────────────────────────────┼────┘
                         ▼                                    ▼ HTTP (plus tard)
                ┌─────────────────┐                ┌──────────────────────┐
                │    MySQL 8      │                │ Fournisseur IA       │
                └─────────────────┘                │ (service / API LLM)  │
                                                   └──────────────────────┘
```

**Monolithe modulaire** : une seule API Express découpée en modules indépendants (un par membre de
l'équipe). Le Front-End ne communique qu'avec l'API, jamais directement avec MySQL ou l'IA.

## 2. Décisions techniques

| Décision                                                  | Pourquoi                                                                                                                |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| JavaScript ES Modules partout                             | Choix de l'équipe : simplicité, une seule syntaxe d'import (`import`/`export`)                                          |
| Monorepo npm workspaces (`shared`, `backend`, `frontend`) | Un seul `npm install`, outils communs, code partagé sans copier-coller                                                  |
| Package `@smart-ecommerce/shared`                         | Rôles, permissions et schémas Zod **définis une seule fois** pour le Front et le Back                                   |
| Express 5                                                 | Les erreurs des fonctions `async` sont transmises automatiquement à `errorHandler` (pas de `try/catch` répétés)         |
| Sequelize 6 + MySQL                                       | ORM choisi par l'équipe ; requêtes paramétrées (protection contre l'injection SQL)                                      |
| Migrations avec Umzug                                     | Bibliothèque utilisée par sequelize-cli, mais compatible ES Modules ; fichiers horodatés = pas de conflit entre membres |
| Zod 4 (messages en français)                              | Validation déclarative, même schéma pour le formulaire et l'API                                                         |
| Vitest (Back + Front)                                     | Même API que Jest mais support natif des ES Modules ; un seul outil de test pour l'équipe                               |
| bcryptjs                                                  | Même algorithme que bcrypt, sans compilation native (installation sans souci sur Windows/macOS/Linux)                   |
| `process.loadEnvFile` + validation Zod                    | Chargement du `.env` natif à Node.js ; l'API refuse de démarrer si la configuration est invalide                        |
| React Router 7                                            | Compatible Node 22 LTS (la v8 exige Node 22.22+) ; API stable et très documentée                                        |
| Tailwind CSS 4                                            | Interface moderne et responsive sans fichiers CSS à maintenir ; couleur de marque dans `index.css`                      |

## 3. Back-End

### Couches

```
routes  →  validate(schéma Zod)  →  controller  →  service  →  modèles Sequelize  →  MySQL
           authenticate + requirePermission        (logique     (un fichier par table)
                                                    métier)
```

- **routes** : URL, middlewares de sécurité et de validation, documentation `@openapi`.
- **controller** : lit `req`, appelle le service, répond avec `sendSuccess` / `sendCreated`.
- **service** : règles métier, transactions, erreurs (`NotFoundError`, `ConflictError`...).
- **modèles** : définition Sequelize + relations (`static associate(models)`).

### Dossier `core/` (commun à tous les modules)

| Élément                       | Rôle                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `errors/`                     | `AppError` et erreurs HTTP (`BadRequestError`, `ValidationError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`) |
| `middlewares/authenticate.js` | Vérifie le JWT, recharge l'utilisateur en base (rôle et blocage pris en compte immédiatement)                                                                      |
| `middlewares/authorize.js`    | `requirePermission(...)`, `requireRole(...)` (fautes de frappe détectées au démarrage)                                                                             |
| `middlewares/validate.js`     | Validation Zod de `params`, `query`, `body` ; erreurs détaillées par champ                                                                                         |
| `middlewares/errorHandler.js` | Format d'erreur unique ; conversion des erreurs Zod, Sequelize et JSON ; pas de détails internes en production                                                     |
| `middlewares/rateLimiters.js` | Limite globale + limite stricte sur connexion/inscription                                                                                                          |
| `security/`                   | JWT (HS256 imposé), hachage des mots de passe, contrôle du propriétaire d'une ressource                                                                            |
| `events/`                     | Bus d'événements interne (`publish` / `subscribe`) pour les effets secondaires                                                                                     |
| `utils/`                      | Format de réponse, pagination, logger                                                                                                                              |

### Modules

Chaque module (`backend/src/modules/<module>/`) possède un `index.js` qui est sa **seule porte d'entrée** :

- `registerRoutes(apiRouter)` : branche ses routes sur `/api/v1` (le fichier central `routes.js` n'est jamais modifié) ;
- les autres exports forment son **API publique** pour les autres modules.

Les modèles de chaque module sont déclarés dans `modules/<module>/models/index.js` puis enregistrés
automatiquement par `database/index.js` (relations comprises).

## 4. Communication entre les modules

| Besoin                                                 | Mécanisme                                                                     | Exemple                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Opérations qui doivent réussir ou échouer **ensemble** | Appel direct du service d'un autre module, dans **une transaction Sequelize** | Confirmation d'une commande + diminution du stock                 |
| Effet secondaire **non critique**                      | Événement interne (`publish`/`subscribe`)                                     | `order.confirmed` → popularité des produits, historique pour l'IA |
| Lecture pour affichage                                 | API publique du module, ou `include` Sequelize en lecture seule               | Nom du produit dans une ligne de commande                         |

### Contrats prévus (API publiques)

| Module   | Fonction                                            | Utilisée par                                    |
| -------- | --------------------------------------------------- | ----------------------------------------------- |
| users    | `findUserById`, `toUserResponse`                    | auth, orders, reviews                           |
| products | `getProductsByIds(ids)`, `assertProductExists(id)`  | orders, reviews, stock                          |
| stock    | `getAvailableQuantity(productId)`                   | products, orders (panier)                       |
| stock    | `decreaseStockForOrder(items, { transaction })`     | orders, à la **confirmation**                   |
| stock    | `restoreStockForOrder(items, { transaction })`      | orders, à l'annulation d'une commande confirmée |
| stock    | `createStockForProduct(productId, { transaction })` | products, à la création d'un produit            |
| orders   | `hasUserPurchasedProduct(userId, productId)`        | reviews (avis réservé aux acheteurs)            |
| reviews  | `getProductRatingSummary(productId)`                | products, ai                                    |

Pendant le développement, un module peut utiliser une **version simulée** (stub) d'une fonction qui
n'existe pas encore, en respectant la signature ci-dessus.

### Règle validée : le stock diminue à la CONFIRMATION de la commande

```
PENDING ──(confirmation par l'admin)──▶ CONFIRMED ──▶ SHIPPED ──▶ DELIVERED
   │                                       │
   └──▶ CANCELLED (stock inchangé)          └──▶ CANCELLED (stock restauré)
```

Confirmation (`orders.service`) dans une seule transaction :

1. relire les lignes de la commande ;
2. `stock.decreaseStockForOrder(items, { transaction })` : verrouille les lignes de stock
   (`SELECT ... FOR UPDATE`), vérifie les quantités, sinon `ConflictError('INSUFFICIENT_STOCK')` → tout est annulé ;
3. passer la commande en `CONFIRMED` et créer le suivi de livraison ;
4. après validation de la transaction : `publish(EVENTS.ORDER_CONFIRMED, ...)` (alertes de stock faible, IA...).

## 5. Modèle de données

| Table                   | Module   | Relations principales                                                                     |
| ----------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `roles` ✅              | users    | 1 rôle → N utilisateurs                                                                   |
| `users` ✅              | users    | N → 1 rôle ; 1 → N adresses, commandes, avis, réclamations ; 1 → 1 panier                 |
| `addresses`             | users    | N → 1 utilisateur                                                                         |
| `categories`            | products | 1 → N produits ; sous-catégories (`parent_id`)                                            |
| `products`              | products | N → 1 catégorie ; 1 → 1 stock                                                             |
| `stocks`                | stock    | 1 → 1 produit (quantité, seuil d'alerte)                                                  |
| `stock_movements`       | stock    | N → 1 produit ; type IN / OUT / ADJUST / RETURN ; commande liée éventuelle                |
| `carts`, `cart_items`   | orders   | 1 panier par utilisateur ; ligne → produit (quantité)                                     |
| `orders`, `order_items` | orders   | commande → utilisateur ; lignes avec **copie du nom et du prix** au moment de la commande |
| `deliveries`            | orders   | 1 → 1 commande (transporteur, numéro de suivi, statut, dates)                             |
| `reviews`               | reviews  | utilisateur + produit (un avis par produit et par utilisateur), note 1 à 5                |
| `complaints`            | reviews  | utilisateur, commande éventuelle, statut, réponse de l'administrateur                     |
| `user_events`           | ai       | historique des interactions (vue, ajout au panier, achat) pour les recommandations        |

✅ = créée au Sprint 0. Conventions : tables au pluriel en `snake_case`, colonnes `snake_case`
(`underscored: true`), montants en `DECIMAL(10,2)`, `created_at` / `updated_at` sur chaque table.

## 6. Front-End

```
src/
├── app/router.jsx        assemble les routes déclarées par chaque module
├── features/<module>/    api/ · pages/ · components/ · routes.jsx (propriété du module)
└── shared/
    ├── api/              httpClient (Axios) + ApiError
    ├── auth/             AuthProvider, useAuth, ProtectedRoute, GuestRoute
    ├── components/       ui/ (Button, TextField, Alert, Spinner, RoleBadge) et layout/
    ├── layouts/          MainLayout (boutique), AdminLayout (back-office)
    └── pages/            accueil, 404, 403, page provisoire « en cours de développement »
```

- **Session** : jeton JWT en `localStorage`, session restaurée au chargement par `GET /auth/me`,
  déconnexion automatique si l'API répond 401 (jeton expiré) ou 403 `ACCOUNT_DISABLED`.
- **Protection des pages** : `<ProtectedRoute permissions={[...]}>` ou `roles={[...]}`. C'est un confort
  d'affichage ; la sécurité réelle est assurée par l'API.
- **Back-office** `/admin` : accessible aux rôles ADMIN et STOCK_MANAGER ; le menu n'affiche que les
  sections autorisées par les permissions.

## 7. Rôles et permissions

La matrice est définie une seule fois dans `shared/src/constants/permissions.js`.

| Permission                                                                                  | CLIENT | STOCK_MANAGER | ADMIN |
| ------------------------------------------------------------------------------------------- | :----: | :-----------: | :---: |
| `cart:manage`, `orders:place`, `reviews:write`, `complaints:create`                         |   ✅   |               |  ✅   |
| `stock:read`, `stock:manage`                                                                |        |      ✅       |  ✅   |
| `users:manage`, `products:manage`, `orders:manage`, `reviews:moderate`, `complaints:manage` |        |               |  ✅   |

## 8. Sécurité

| Risque                            | Mesure en place                                                                                    |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mots de passe                     | bcrypt (12 tours), jamais stockés, renvoyés ou journalisés en clair ; politique de complexité      |
| Authentification                  | JWT signé HS256 (algorithme imposé), expiration courte (`JWT_EXPIRES_IN`), secret dans `.env`      |
| Compte bloqué / rôle modifié      | relu en base à chaque requête : effet immédiat                                                     |
| Élévation de privilèges           | l'inscription crée toujours un CLIENT ; les champs inconnus sont retirés par Zod                   |
| Accès aux données d'autrui (IDOR) | `assertOwnershipOrPermission` dans les services                                                    |
| Injection SQL                     | Sequelize (requêtes paramétrées) ; tri/filtre via listes blanches Zod                              |
| Énumération des comptes           | même message et temps de réponse similaire pour email inconnu / mauvais mot de passe               |
| Force brute                       | limite de requêtes stricte sur `/auth/login` et `/auth/register`                                   |
| En-têtes HTTP, CORS               | `helmet`, CORS limité aux origines de `CORS_ORIGIN`                                                |
| Abus de charge                    | corps JSON limité à 100 ko, pagination plafonnée à 100 éléments                                    |
| Fuite d'informations              | erreurs génériques en production, pile d'appels uniquement en développement                        |
| Secrets                           | `.env` hors de Git, `.env.example` sans valeur, secrets aléatoires générés par `npm run setup:env` |
| XSS (Front-End)                   | React échappe le contenu ; pas de `dangerouslySetInnerHTML` avec des données utilisateur           |

## 9. Tests

| Niveau                            | Outil                      | Emplacement                  |
| --------------------------------- | -------------------------- | ---------------------------- |
| Unitaires Back-End (sans BDD)     | Vitest                     | `backend/tests/unit/`        |
| Unitaires du module Stock         | Jest (imposé par le cours) | `backend/tests/unit/stock/`  |
| API / intégration (MySQL de test) | Vitest + Supertest         | `backend/tests/integration/` |
| Code partagé                      | Vitest                     | `shared/tests/`              |
| Composants et pages               | Vitest + Testing Library   | `frontend/src/**/*.test.jsx` |

Les tests d'intégration utilisent la base `DB_NAME_TEST` : elle est reconstruite par les migrations au début
de chaque exécution, et vidée avant chaque test (les rôles sont conservés). Helpers disponibles :
`createTestUser`, `createAuthenticatedUser` (`backend/tests/helpers/factories.js`) et
`renderWithProviders` (`frontend/src/test/renderWithProviders.jsx`).

## 10. Intelligence artificielle (`modules/ai`)

L'IA est présente dans tous les modules, sans dépendre d'un service externe :

```
Front-End ──▶ /api/v1/ai/... ──▶ services/ (orchestration, cache)
                                   ├── engine/   algorithmes locaux, fonctions pures testées unitairement
                                   │             (prévision, recommandations, bayésien naïf, réclamations,
                                   │              score de risque, RFM, réception, assistant, résumé d'avis)
                                   └── llm/claude.js   Claude (SDK officiel), facultatif
                ▲
     données lues via l'API publique des autres modules (getOrderHistory, getCatalogSnapshot...)
```

| Module       | Fonction d'IA                                | Technique                                                                   |
| ------------ | -------------------------------------------- | --------------------------------------------------------------------------- |
| Stock        | Prévision des ruptures, réassorts, seuils    | Croston (SBA) / lissage exponentiel, profil hebdomadaire, stock de sécurité |
| Stock        | Réception intelligente d'un bon de livraison | Analyse du texte + appariement flou (trigrammes) ; photo : Claude (vision)  |
| Produits     | Recommandations (accueil, fiche, panier)     | Co-achats + TF-IDF + popularité bayésienne, selon le stock                  |
| Produits     | Catégorie suggérée, description rédigée      | Bayésien naïf ; Claude ou gabarit                                           |
| Avis         | Résumé des avis                              | Aspects + polarité (lexique, négation) ; Claude                             |
| Réclamations | Catégorie, priorité, brouillon de réponse    | Mots-clés pondérés, ton, ancienneté ; Claude ou gabarit                     |
| Commandes    | Score de risque                              | Détection d'anomalies explicable (z-score, ville, quantités...)             |
| Utilisateurs | Segmentation des clients                     | RFM + baisse du rythme d'achat                                              |
| Boutique     | Assistant d'achat                            | Compréhension locale (budget, rayon, intention) ; Claude + outils           |
| Back-office  | Briefing du jour, Centre IA                  | Synthèse des constats ; évaluation hors échantillon des modèles             |

- **Claude facultatif** : `ANTHROPIC_API_KEY` dans `backend/.env` (jamais côté Front). Réponses JSON par
  _structured outputs_, effort « low », repli serveur en cas de refus (`fallbacks: "default"`), puis repli
  local automatique (`withClaude()`) : l'application fonctionne toujours, même sans réseau.
  `AI_PROVIDER=local` force le mode local ; les tests n'appellent jamais Claude.
- **L'IA propose, l'humain décide** : aucune route `/ai` ne modifie de données. Les actions (réassort,
  réponse à une réclamation, confirmation d'une commande) passent par les routes habituelles du module.
- **Données** : lecture seule via l'API publique des autres modules. Seules des données utiles et
  minimales sont transmises à Claude (jamais d'email ni d'adresse ; prénom du client pour une réponse).
- **Cache** : les modèles (prévision, recommandations) sont recalculés après chaque événement de commande
  (`order.*`) ou d'avis (`review.changed`), sinon au plus toutes les 5 minutes ; le stock est lu en direct.
- **Évaluation** (Centre IA, `GET /ai/evaluation`) : backtest des prévisions sur 28 jours contre une
  moyenne naïve (WAPE), taux de réussite des recommandations contre la popularité, précision du
  classifieur de catégories (leave-one-out) et du tri des réclamations (jeu de test étiqueté).
- **Données de démonstration** : le seeder `sales-history` génère 6 mois de ventes réalistes (saisonnalité
  hebdomadaire, tendances, promotions, co-achats, réassorts) en gardant l'historique du stock cohérent.
