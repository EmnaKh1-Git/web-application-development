# API REST — conventions et contrat

Documentation interactive (générée depuis le code) : **http://localhost:4000/api/docs**

## Conventions

- **URL de base** : `http://localhost:4000/api/v1`
- **Format** : JSON (`Content-Type: application/json`), corps limité à 100 ko
- **Authentification** : en-tête `Authorization: Bearer <jeton>` (jeton reçu à l'inscription ou à la connexion)
- **Noms** : ressources au pluriel en minuscules (`/products`, `/orders/:id`) ; champs JSON en `camelCase`
- **Méthodes** : `GET` lire · `POST` créer (201) · `PUT` remplacer · `PATCH` modifier partiellement · `DELETE` supprimer (204)

### Réponse en cas de succès

```json
{ "success": true, "data": { "id": 1, "name": "Clavier" } }
```

Liste paginée (`?page=1&limit=20`, `limit` ≤ 100) :

```json
{
  "success": true,
  "data": [ ... ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```

### Réponse en cas d'erreur

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Les données envoyées sont invalides",
    "details": [{ "field": "email", "location": "body", "message": "Adresse email invalide" }]
  }
}
```

Le Front-End s'appuie sur `code` (stable), et affiche `message` (en français).

### Codes d'erreur

| HTTP | Code                                                    | Signification                                                   |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`                                      | Données invalides (détail par champ dans `details`)             |
| 400  | `INVALID_JSON`                                          | Corps de requête qui n'est pas du JSON valide                   |
| 401  | `AUTH_REQUIRED`                                         | Jeton absent                                                    |
| 401  | `INVALID_TOKEN` / `TOKEN_EXPIRED`                       | Jeton invalide / expiré : se reconnecter                        |
| 401  | `INVALID_CREDENTIALS`                                   | Email ou mot de passe incorrect                                 |
| 403  | `FORBIDDEN`                                             | Rôle ou permission insuffisants                                 |
| 403  | `ACCOUNT_DISABLED`                                      | Compte bloqué par un administrateur                             |
| 403  | `NOT_RESOURCE_OWNER`                                    | Ressource appartenant à un autre utilisateur                    |
| 404  | `NOT_FOUND`, `ROUTE_NOT_FOUND`, `<RESSOURCE>_NOT_FOUND` | Ressource ou route introuvable                                  |
| 409  | `EMAIL_ALREADY_USED`, `DUPLICATE_ENTRY`                 | Valeur déjà utilisée                                            |
| 409  | `FOREIGN_KEY_CONSTRAINT`                                | Ressource liée à d'autres données                               |
| 413  | `PAYLOAD_TOO_LARGE`                                     | Corps de requête trop volumineux                                |
| 429  | `TOO_MANY_REQUESTS`                                     | Trop de requêtes : réessayer plus tard                          |
| 500  | `INTERNAL_ERROR`                                        | Erreur inattendue (détails uniquement dans les logs du serveur) |

Chaque module ajoute ses codes métier en MAJUSCULES (ex. `PRODUCT_NOT_FOUND`, `INSUFFICIENT_STOCK`) et
les documente ci-dessous.

## Rôles et permissions

| Permission          | Accordée à           | Utilisée pour                               |
| ------------------- | -------------------- | ------------------------------------------- |
| `cart:manage`       | CLIENT, ADMIN        | panier                                      |
| `orders:place`      | CLIENT, ADMIN        | passer et suivre ses commandes              |
| `reviews:write`     | CLIENT, ADMIN        | créer / modifier ses avis                   |
| `complaints:create` | CLIENT, ADMIN        | déposer et suivre ses réclamations          |
| `stock:read`        | STOCK_MANAGER, ADMIN | consulter le stock, alertes, mouvements     |
| `stock:manage`      | STOCK_MANAGER, ADMIN | ajouter / corriger le stock                 |
| `ai:insights`       | STOCK_MANAGER, ADMIN | Centre IA : briefing et qualité des modèles |
| `users:manage`      | ADMIN                | gestion des utilisateurs et des rôles       |
| `products:manage`   | ADMIN                | CRUD produits et catégories                 |
| `orders:manage`     | ADMIN                | toutes les commandes, statuts, livraisons   |
| `reviews:moderate`  | ADMIN                | suppression de n'importe quel avis          |
| `complaints:manage` | ADMIN                | traitement des réclamations                 |

## Système et authentification

| Méthode | Route            | Objectif                                                     | Accès           |
| ------- | ---------------- | ------------------------------------------------------------ | --------------- |
| GET     | `/health`        | État de l'API et de la base de données                       | public          |
| POST    | `/auth/register` | Créer un compte (toujours CLIENT), renvoie `{ token, user }` | public (limité) |
| POST    | `/auth/login`    | Se connecter, renvoie `{ token, user }`                      | public (limité) |
| GET     | `/auth/me`       | Utilisateur connecté (avec `role` et `permissions`)          | connecté        |

## Routes par module

Accès : 🌐 public · 👤 connecté · 🔑 permission requise · (propriétaire) = uniquement ses propres données.
Les listes sont paginées (`?page=1&limit=20`, 100 au maximum) et renvoient `meta`.
La documentation interactive complète est servie par l'API sur `/api/docs` (Swagger).

### Utilisateurs — Fares (`/users`, `/admin/users`)

| Méthode        | Route                                                    | Objectif                                              | Accès             |
| -------------- | -------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| PATCH          | `/users/me`                                              | Modifier son profil                                   | 👤                |
| PATCH          | `/users/me/password`                                     | Changer son mot de passe (ancien mot de passe requis) | 👤                |
| GET / POST     | `/users/me/addresses`                                    | Lister / ajouter une adresse                          | 👤                |
| PATCH / DELETE | `/users/me/addresses/:id`                                | Modifier / supprimer une adresse                      | 👤 (propriétaire) |
| GET            | `/admin/users?search=&role=&status=all\|active\|blocked` | Lister les utilisateurs                               | 🔑 `users:manage` |
| GET            | `/admin/users/:id`                                       | Détail d'un utilisateur (avec ses adresses)           | 🔑 `users:manage` |
| PATCH          | `/admin/users/:id/status`                                | Bloquer / débloquer `{ isActive }`                    | 🔑 `users:manage` |
| PATCH          | `/admin/users/:id/role`                                  | Changer le rôle `{ role }`                            | 🔑 `users:manage` |

Codes métier : `INVALID_CURRENT_PASSWORD`, `CANNOT_MODIFY_SELF` (un administrateur ne peut ni se bloquer
ni changer son propre rôle), `ADDRESS_NOT_FOUND`, `USER_NOT_FOUND`.

### Produits & catégories — Emna (`/products`, `/categories`)

| Méthode             | Route                                                                                                               | Objectif                              | Accès                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------- |
| GET                 | `/products?search=&categoryId=&minPrice=&maxPrice=&inStock=&sort=newest\|price_asc\|price_desc\|popularity\|rating` | Recherche, filtres, tri, pagination   | 🌐 (`includeInactive=true` : 🔑) |
| GET                 | `/products/:id`                                                                                                     | Détail (disponibilité, note moyenne)  | 🌐                               |
| POST / PUT / DELETE | `/products[/:id]`                                                                                                   | CRUD (suppression = désactivation)    | 🔑 `products:manage`             |
| GET                 | `/categories`, `/categories/:id`                                                                                    | Lister (avec `productCount`) / détail | 🌐                               |
| POST / PUT / DELETE | `/categories[/:id]`                                                                                                 | CRUD                                  | 🔑 `products:manage`             |

Un produit contient `imageUrl` (image principale), `imageUrls` (galerie, 8 au maximum), `sizes` et
`colors` (variantes proposées, listes vides si le produit n'en a pas). `PUT` remplace **tout** le produit :
renvoyer la galerie, les tailles et les couleurs existantes pour ne pas les effacer. À la création,
`initialStock` est transmis au module Stock. Codes métier : `PRODUCT_NOT_FOUND`, `CATEGORY_NOT_FOUND`,
`CATEGORY_NAME_TAKEN`, `CATEGORY_NOT_EMPTY`.

### Panier, commandes & livraison — Oussama (`/cart`, `/orders`, `/admin/orders`)

| Méthode        | Route                           | Objectif                                                                                              | Accès                            |
| -------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| GET            | `/cart`                         | Mon panier (total calculé par le serveur)                                                             | 🔑 `cart:manage`                 |
| POST           | `/cart/items`                   | Ajouter `{ productId, quantity, size?, color? }`                                                      | 🔑 `cart:manage`                 |
| PATCH / DELETE | `/cart/items/:itemId`           | Modifier la quantité / retirer                                                                        | 🔑 `cart:manage` (propriétaire)  |
| DELETE         | `/cart`                         | Vider le panier                                                                                       | 🔑 `cart:manage`                 |
| POST           | `/orders`                       | Créer une commande `PENDING` depuis le panier `{ addressId }` (stock vérifié, **pas encore diminué**) | 🔑 `orders:place`                |
| GET            | `/orders`, `/orders/:id`        | Mes commandes / détail                                                                                | 🔑 `orders:place` (propriétaire) |
| PATCH          | `/orders/:id/cancel`            | Annuler (avant expédition ; stock restauré si la commande était confirmée)                            | 🔑 `orders:place` (propriétaire) |
| GET            | `/orders/:id/delivery`          | Suivi de livraison                                                                                    | 🔑 `orders:place` (propriétaire) |
| GET            | `/admin/orders?status=&search=` | Toutes les commandes (recherche : n° de commande, nom ou email du client)                             | 🔑 `orders:manage`               |
| GET            | `/admin/orders/stats`           | Nombre de commandes par statut et chiffre d'affaires                                                  | 🔑 `orders:manage`               |
| PATCH          | `/admin/orders/:id/status`      | Changer le statut — **`CONFIRMED` diminue le stock** (transaction)                                    | 🔑 `orders:manage`               |
| PATCH          | `/admin/orders/:id/delivery`    | Transporteur, numéro de suivi, date de livraison prévue                                               | 🔑 `orders:manage`               |

Transitions autorisées (`ORDER_STATUS_TRANSITIONS`) : `PENDING → CONFIRMED | CANCELLED`,
`CONFIRMED → SHIPPED | CANCELLED`, `SHIPPED → DELIVERED`.

**Variantes (tailles, couleurs)** : si le produit propose des tailles ou des couleurs, le choix est obligatoire
et doit faire partie de ses listes. Chaque variante occupe sa propre ligne du panier (deux ajouts de la même
variante sont regroupés), mais **toutes les variantes d'un produit partagent le même stock** : les contrôles
du panier, de la commande et de la confirmation portent sur la quantité totale du produit.

Codes métier : `PRODUCT_SIZE_REQUIRED`, `INVALID_PRODUCT_SIZE`, `PRODUCT_COLOR_REQUIRED`,
`INVALID_PRODUCT_COLOR`, `CART_QUANTITY_LIMIT` (20 exemplaires par produit), `INSUFFICIENT_STOCK`, `EMPTY_CART`,
`CART_UNAVAILABLE_ITEMS`, `INVALID_STATUS_TRANSITION`, `ORDER_NOT_CANCELLABLE`, `DELIVERY_LOCKED`.

### Avis & réclamations — Hajer (`/products/:productId/reviews`, `/reviews`, `/complaints`)

| Méthode | Route                               | Objectif                                                                  | Accès                                 |
| ------- | ----------------------------------- | ------------------------------------------------------------------------- | ------------------------------------- |
| GET     | `/products/:productId/reviews`      | Avis d'un produit + résumé des notes + `viewer` (`canReview`, `myReview`) | 🌐 / 👤                               |
| POST    | `/products/:productId/reviews`      | Créer un avis (produit acheté et livré)                                   | 🔑 `reviews:write`                    |
| GET     | `/reviews/me`                       | Mes avis                                                                  | 👤                                    |
| PATCH   | `/reviews/:id`                      | Modifier son avis                                                         | 🔑 `reviews:write` (propriétaire)     |
| DELETE  | `/reviews/:id`                      | Supprimer                                                                 | propriétaire ou 🔑 `reviews:moderate` |
| POST    | `/complaints`                       | Créer une réclamation (`orderId` facultatif)                              | 🔑 `complaints:create`                |
| GET     | `/complaints`, `/complaints/:id`    | Mes réclamations / détail                                                 | 🔑 `complaints:create` (propriétaire) |
| GET     | `/admin/complaints?status=&search=` | Toutes les réclamations                                                   | 🔑 `complaints:manage`                |
| GET     | `/admin/complaints/stats`           | Nombre de réclamations par statut                                         | 🔑 `complaints:manage`                |
| PATCH   | `/admin/complaints/:id`             | Traiter (statut + réponse, obligatoire pour clôturer)                     | 🔑 `complaints:manage`                |

Codes métier : `PURCHASE_REQUIRED`, `REVIEW_ALREADY_EXISTS`, `REVIEW_NOT_FOUND`, `COMPLAINT_NOT_FOUND`.

### Stock — Yassine (`/stock`)

| Méthode | Route                                                                                                        | Objectif                                                 | Accès             |
| ------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------- |
| GET     | `/stock?status=all\|ok\|low\|out\|alert&search=&categoryId=&sort=name\|quantity_asc\|quantity_desc\|updated` | Consulter le stock                                       | 🔑 `stock:read`   |
| GET     | `/stock/summary`                                                                                             | Chiffres clés (produits, unités, stock faible, ruptures) | 🔑 `stock:read`   |
| GET     | `/stock/alerts`                                                                                              | Produits au seuil d'alerte ou en dessous                 | 🔑 `stock:read`   |
| GET     | `/stock/movements?productId=&type=IN\|OUT\|ADJUST\|RETURN`                                                   | Historique de tous les mouvements                        | 🔑 `stock:read`   |
| GET     | `/stock/:productId`                                                                                          | Stock d'un produit                                       | 🔑 `stock:read`   |
| GET     | `/stock/:productId/movements`                                                                                | Historique des mouvements d'un produit                   | 🔑 `stock:read`   |
| POST    | `/stock/:productId/add`                                                                                      | Ajouter du stock `{ quantity, reason }`                  | 🔑 `stock:manage` |
| PATCH   | `/stock/:productId`                                                                                          | Inventaire : `{ quantity?, lowStockThreshold?, reason }` | 🔑 `stock:manage` |

La diminution automatique n'a pas de route : elle est appelée par le module Commandes lors de la
confirmation (`decreaseStockForOrder`, voir [ARCHITECTURE.md](ARCHITECTURE.md#4-communication-entre-les-modules)).
Les lignes d'une commande qui visent le même produit (variantes) sont additionnées : un seul contrôle et un
seul mouvement `OUT` par produit (et un seul `RETURN` en cas d'annulation). Chaque mouvement enregistre la
variation signée et la quantité après l'opération. Codes métier : `INSUFFICIENT_STOCK` (avec le détail
des produits manquants), `NEGATIVE_STOCK`, `STOCK_NOT_FOUND`.

### Intelligence Artificielle (`/ai`)

Toutes les routes fonctionnent **sans service externe** (algorithmes locaux). Si une clé Anthropic est
configurée, Claude enrichit celles marquées « + Claude », avec repli automatique sur l'IA locale.
Chaque réponse indique sa `source` (`claude` ou `local`). L'IA ne modifie jamais les données : elle
propose, l'utilisateur valide (ex. la réception passe ensuite par `POST /stock/:productId/add`).

| Méthode | Route                                        | Objectif                                                                                         | Accès                      |
| ------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------- |
| GET     | `/ai/status`                                 | Fournisseur actif (`local` ou `claude`)                                                          | 🌐                         |
| GET     | `/ai/recommendations?productId=&productIds=` | Recommandations (produit, panier, personnalisées si connecté, sinon populaires) avec leur raison | 🌐 / 👤                    |
| GET     | `/ai/products/:productId/reviews-summary`    | Résumé des avis (points forts / faibles), dès 2 avis — + Claude                                  | 🌐                         |
| POST    | `/ai/assistant`                              | Assistant d'achat `{ messages: [{ role, content }] }` — + Claude (outils)                        | 🌐 / 👤 (limité)           |
| GET     | `/ai/stock/forecast`                         | Prévision de rupture et quantité conseillée pour chaque produit                                  | 🔑 `stock:read`            |
| GET     | `/ai/stock/forecast/:productId?horizon=30`   | Historique, prévision jour par jour (intervalle à 80 %) et stock projeté                         | 🔑 `stock:read`            |
| POST    | `/ai/stock/reception`                        | Lecture d'un bon de livraison `{ text }` ou `{ image, mediaType }` (photo : Claude)              | 🔑 `stock:manage` (limité) |
| GET     | `/ai/complaints/insights`                    | Catégorie et priorité de chaque réclamation                                                      | 🔑 `complaints:manage`     |
| POST    | `/ai/complaints/:id/reply`                   | Brouillon de réponse au client — + Claude                                                        | 🔑 `complaints:manage`     |
| POST    | `/ai/products/describe`                      | Description de produit `{ name, categoryId?, price?, sizes?, colors? }` — + Claude               | 🔑 `products:manage`       |
| POST    | `/ai/products/categorize`                    | Catégorie suggérée `{ name, description? }` (bayésien naïf)                                      | 🔑 `products:manage`       |
| GET     | `/ai/orders/risk?ids=`                       | Score de risque (par défaut : commandes en attente ou confirmées)                                | 🔑 `orders:manage`         |
| GET     | `/ai/customers/segments`                     | Segmentation RFM des clients                                                                     | 🔑 `users:manage`          |
| GET     | `/ai/briefing`                               | Constats du jour selon les permissions — + Claude (synthèse)                                     | 🔑 `ai:insights`           |
| GET     | `/ai/evaluation`                             | Qualité mesurée des modèles (backtest, taux de réussite, précision)                              | 🔑 `ai:insights`           |

Les routes qui peuvent appeler Claude sont limitées (`AI_RATE_LIMIT_MAX` requêtes par fenêtre). Codes métier :
`AI_VISION_UNAVAILABLE` (photo envoyée sans Claude configuré), `AI_UNAVAILABLE` (lecture de la photo impossible).
