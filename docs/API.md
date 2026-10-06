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

| Permission          | Accordée à           | Utilisée pour                             |
| ------------------- | -------------------- | ----------------------------------------- |
| `cart:manage`       | CLIENT, ADMIN        | panier                                    |
| `orders:place`      | CLIENT, ADMIN        | passer et suivre ses commandes            |
| `reviews:write`     | CLIENT, ADMIN        | créer / modifier ses avis                 |
| `complaints:create` | CLIENT, ADMIN        | déposer et suivre ses réclamations        |
| `stock:read`        | STOCK_MANAGER, ADMIN | consulter le stock, alertes, mouvements   |
| `stock:manage`      | STOCK_MANAGER, ADMIN | ajouter / corriger le stock               |
| `users:manage`      | ADMIN                | gestion des utilisateurs et des rôles     |
| `products:manage`   | ADMIN                | CRUD produits et catégories               |
| `orders:manage`     | ADMIN                | toutes les commandes, statuts, livraisons |
| `reviews:moderate`  | ADMIN                | suppression de n'importe quel avis        |
| `complaints:manage` | ADMIN                | traitement des réclamations               |

## Routes disponibles (Sprint 0)

| Méthode | Route            | Objectif                                                     | Accès           |
| ------- | ---------------- | ------------------------------------------------------------ | --------------- |
| GET     | `/health`        | État de l'API et de la base de données                       | public          |
| POST    | `/auth/register` | Créer un compte (toujours CLIENT), renvoie `{ token, user }` | public (limité) |
| POST    | `/auth/login`    | Se connecter, renvoie `{ token, user }`                      | public (limité) |
| GET     | `/auth/me`       | Utilisateur connecté (avec `role` et `permissions`)          | connecté        |

## Routes prévues par module

Accès : 🌐 public · 👤 connecté · 🔑 permission requise · (propriétaire) = uniquement ses propres données.

### Utilisateurs — Fares (`/users`, `/admin/users`)

| Méthode        | Route                              | Objectif                                              | Accès             |
| -------------- | ---------------------------------- | ----------------------------------------------------- | ----------------- |
| PATCH          | `/users/me`                        | Modifier son profil                                   | 👤                |
| PATCH          | `/users/me/password`               | Changer son mot de passe (ancien mot de passe requis) | 👤                |
| GET            | `/users/me/history`                | Historique (commandes, avis, réclamations)            | 👤                |
| GET / POST     | `/users/me/addresses`              | Lister / ajouter une adresse                          | 👤                |
| PATCH / DELETE | `/users/me/addresses/:id`          | Modifier / supprimer une adresse                      | 👤 (propriétaire) |
| GET            | `/admin/users?search=&role=&page=` | Lister les utilisateurs                               | 🔑 `users:manage` |
| GET            | `/admin/users/:id`                 | Détail d'un utilisateur                               | 🔑 `users:manage` |
| PATCH          | `/admin/users/:id/status`          | Bloquer / débloquer                                   | 🔑 `users:manage` |
| PATCH          | `/admin/users/:id/role`            | Changer le rôle                                       | 🔑 `users:manage` |

### Produits & catégories — Emna (`/products`, `/categories`)

| Méthode             | Route                                                                                                         | Objectif                             | Accès                |
| ------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------- |
| GET                 | `/products?search=&category=&minPrice=&maxPrice=&sort=price_asc\|price_desc\|popularity\|newest&page=&limit=` | Recherche, filtres, tri, pagination  | 🌐                   |
| GET                 | `/products/:id`                                                                                               | Détail (disponibilité, note moyenne) | 🌐                   |
| POST / PUT / DELETE | `/products[/:id]`                                                                                             | CRUD (suppression = désactivation)   | 🔑 `products:manage` |
| GET                 | `/categories`, `/categories/:id`                                                                              | Lister / détail                      | 🌐                   |
| POST / PUT / DELETE | `/categories[/:id]`                                                                                           | CRUD                                 | 🔑 `products:manage` |

### Panier, commandes & livraison — Oussama (`/cart`, `/orders`, `/admin/orders`)

| Méthode        | Route                        | Objectif                                                                                              | Accès                            |
| -------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------- |
| GET            | `/cart`                      | Mon panier (total calculé par le serveur)                                                             | 🔑 `cart:manage`                 |
| POST           | `/cart/items`                | Ajouter `{ productId, quantity }`                                                                     | 🔑 `cart:manage`                 |
| PATCH / DELETE | `/cart/items/:itemId`        | Modifier la quantité / retirer                                                                        | 🔑 `cart:manage` (propriétaire)  |
| DELETE         | `/cart`                      | Vider le panier                                                                                       | 🔑 `cart:manage`                 |
| POST           | `/orders`                    | Créer une commande `PENDING` depuis le panier `{ addressId }` (stock vérifié, **pas encore diminué**) | 🔑 `orders:place`                |
| GET            | `/orders`, `/orders/:id`     | Mes commandes / détail                                                                                | 🔑 `orders:place` (propriétaire) |
| PATCH          | `/orders/:id/cancel`         | Annuler (avant expédition ; stock restauré si la commande était confirmée)                            | 🔑 `orders:place` (propriétaire) |
| GET            | `/orders/:id/delivery`       | Suivi de livraison                                                                                    | 🔑 `orders:place` (propriétaire) |
| GET            | `/admin/orders?status=`      | Toutes les commandes                                                                                  | 🔑 `orders:manage`               |
| PATCH          | `/admin/orders/:id/status`   | Changer le statut — **`CONFIRMED` diminue le stock** (transaction)                                    | 🔑 `orders:manage`               |
| PATCH          | `/admin/orders/:id/delivery` | Transporteur, numéro de suivi, statut de livraison                                                    | 🔑 `orders:manage`               |

### Avis & réclamations — Hajer (`/products/:productId/reviews`, `/reviews`, `/complaints`)

| Méthode | Route                            | Objectif                                | Accès                                 |
| ------- | -------------------------------- | --------------------------------------- | ------------------------------------- |
| GET     | `/products/:productId/reviews`   | Avis d'un produit                       | 🌐                                    |
| POST    | `/products/:productId/reviews`   | Créer un avis (produit acheté et livré) | 🔑 `reviews:write`                    |
| PATCH   | `/reviews/:id`                   | Modifier son avis                       | 🔑 `reviews:write` (propriétaire)     |
| DELETE  | `/reviews/:id`                   | Supprimer                               | propriétaire ou 🔑 `reviews:moderate` |
| POST    | `/complaints`                    | Créer une réclamation                   | 🔑 `complaints:create`                |
| GET     | `/complaints`, `/complaints/:id` | Mes réclamations / détail               | 🔑 `complaints:create` (propriétaire) |
| GET     | `/admin/complaints?status=`      | Toutes les réclamations                 | 🔑 `complaints:manage`                |
| PATCH   | `/admin/complaints/:id`          | Traiter (statut + réponse)              | 🔑 `complaints:manage`                |

### Stock — Yassine (`/stock`)

| Méthode | Route                               | Objectif                                  | Accès             |
| ------- | ----------------------------------- | ----------------------------------------- | ----------------- |
| GET     | `/stock?lowOnly=&outOfStock=&page=` | Consulter le stock                        | 🔑 `stock:read`   |
| GET     | `/stock/alerts`                     | Produits sous le seuil d'alerte           | 🔑 `stock:read`   |
| GET     | `/stock/:productId`                 | Stock d'un produit                        | 🔑 `stock:read`   |
| GET     | `/stock/:productId/movements`       | Historique des mouvements                 | 🔑 `stock:read`   |
| POST    | `/stock/:productId/add`             | Ajouter du stock `{ quantity, reason }`   | 🔑 `stock:manage` |
| PATCH   | `/stock/:productId`                 | Corriger la quantité ou le seuil d'alerte | 🔑 `stock:manage` |

La diminution automatique n'a pas de route : elle est appelée par le module Commandes lors de la
confirmation (`decreaseStockForOrder`, voir [ARCHITECTURE.md](ARCHITECTURE.md#4-communication-entre-les-modules)).

### Intelligence Artificielle (étape IA, `/ai`)

| Méthode | Route                            | Objectif                                     | Accès   |
| ------- | -------------------------------- | -------------------------------------------- | ------- |
| GET     | `/ai/recommendations?productId=` | Recommandations (personnalisées si connecté) | 🌐 / 👤 |
| POST    | `/ai/chat`                       | Message au chatbot / assistant               | 🌐 / 👤 |
