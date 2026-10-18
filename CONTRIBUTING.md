# Guide de contribution

Ce guide explique comment les 5 membres de l'équipe travaillent en parallèle sans se gêner.

## 1. Workflow Git

```
main        ← version stable, démontrable (tags v0.1, v0.2, v1.0)
 └─ develop ← intégration de l'équipe (toutes les PR arrivent ici)
     ├─ feature/users-profile          (Fares)
     ├─ feature/products-search        (Emna)
     ├─ feature/orders-checkout        (Oussama)
     ├─ feature/reviews-crud           (Hajer)
     ├─ feature/stock-alerts           (Yassine)
     └─ fix/orders-total-rounding
```

- **Nommage des branches** : `feature/<module>-<description>`, `fix/<module>-<description>`, `docs/...`, `chore/...`
  (modules : `auth`, `users`, `products`, `orders`, `reviews`, `stock`, `ai`, `core`, `shared`, `frontend`).
- **Branches courtes** : 2 à 4 jours maximum. Une grosse fonctionnalité se découpe en plusieurs PR.
- **Interdit** : pousser directement sur `main` ou `develop`.

### Routine quotidienne

```bash
git switch develop
git pull
git switch -c feature/stock-alerts
```

Pendant le travail, récupérez régulièrement les changements de l'équipe :

```bash
git fetch origin
git rebase origin/develop
```

## 2. Commits (Conventional Commits)

Format : `type(module): description` — vérifié automatiquement à chaque commit (commitlint).

| Type       | Usage                                             | Exemple                                             |
| ---------- | ------------------------------------------------- | --------------------------------------------------- |
| `feat`     | nouvelle fonctionnalité                           | `feat(stock): ajout des alertes de stock faible`    |
| `fix`      | correction de bug                                 | `fix(orders): restauration du stock à l'annulation` |
| `test`     | ajout ou correction de tests                      | `test(auth): connexion d'un compte bloqué`          |
| `refactor` | amélioration du code sans changer le comportement | `refactor(products): extraction du filtre de prix`  |
| `docs`     | documentation                                     | `docs(api): routes du panier`                       |
| `chore`    | configuration, dépendances, outillage             | `chore(ci): cache npm`                              |

Un commit = un changement logique. Avant chaque commit, Husky lance automatiquement ESLint et Prettier
sur les fichiers modifiés.

## 3. Pull requests

1. La PR cible **toujours `develop`**.
2. Remplissez le modèle (description, module, comment tester, checklist).
3. **CI verte obligatoire** : lint, format, tests (dont l'intégration MySQL) et build.
4. **1 relecteur minimum**, de préférence un membre dont le module dépend du vôtre.
   **2 relecteurs** si la PR touche une zone commune : `backend/src/core/`, `shared/`, `backend/src/routes.js`,
   `frontend/src/app/router.jsx`, `frontend/src/shared/`, configuration ou CI.
5. Fusion en **« Squash and merge »** pour garder un historique lisible.
6. En fin de sprint : PR `develop` → `main`, puis tag (`v0.1`, `v0.2`...) et démonstration.

### Paramètres GitHub à activer une fois (propriétaire du dépôt)

- Settings → Branches → règles de protection pour `main` et `develop` : PR obligatoire, 1 approbation,
  vérifications « Lint et format » et « Tests et build » obligatoires.
- Settings → General → autoriser uniquement « Squash merging ».

## 4. Conflits

- Ils sont rares si chacun reste dans son module et que les branches sont courtes.
- La personne qui ouvre la PR résout les conflits **sur sa branche** (`git rebase origin/develop`),
  puis relance `npm test` avant de pousser (`git push --force-with-lease`).
- Si le conflit touche le code d'un autre membre : résolvez-le **ensemble**.
- Ne modifiez **jamais** une migration déjà fusionnée dans `develop` : créez-en une nouvelle.
- `package-lock.json` en conflit : prenez la version de `develop`, puis relancez `npm install`.

## 5. Règles d'architecture (à respecter dans chaque module)

1. **Un module ne touche jamais aux tables d'un autre module.** Il utilise l'API publique exportée par le
   `index.js` de ce module (ex. `import * as stockModule from '../stock/index.js'`).
2. **Couches du Back-End** : `routes` → `validate(schéma Zod)` → `controller` → `service` → `modèles Sequelize`.
   - le contrôleur ne fait que le lien HTTP (lire `req`, appeler le service, répondre) ;
   - toute la logique métier est dans le service ;
   - aucune requête SQL écrite à la main avec concaténation de chaînes.
3. **Validation** : chaque entrée (`body`, `params`, `query`) est validée par Zod côté Back-End.
   Les formulaires du Front-End réutilisent les mêmes schémas quand ils sont dans `shared/`.
4. **Erreurs** : on lève une erreur de `core/errors` (`NotFoundError`, `ConflictError`...) avec un code
   en MAJUSCULES ; `errorHandler` formate la réponse. Pas de `try/catch` dans les contrôleurs (Express 5
   transmet automatiquement les erreurs des fonctions `async`).
5. **Sécurité** : chaque route non publique a `authenticate` puis `requirePermission(PERMISSIONS.X)`.
   Une ressource personnelle (commande, avis, adresse...) est vérifiée avec `assertOwnershipOrPermission`.
6. **Opérations liées** (ex. confirmer une commande et diminuer le stock) : appels directs entre services
   dans **une transaction Sequelize**. Les **événements** (`publish`/`subscribe`) servent uniquement aux
   effets secondaires non critiques.
7. **Aucun secret dans le code** : tout passe par `backend/.env` et `env.js`.
8. **Zod** s'importe depuis `@smart-ecommerce/shared` (messages d'erreur en français) — ESLint le vérifie.

## 6. Ajouter une fonctionnalité pas à pas (exemple : le stock)

**Back-End**

1. Migration : `npm run db:migration:create -w backend -- create-stocks.js`, puis compléter `up`/`down`
   et `npm run db:migrate`.
2. Modèle : `backend/src/modules/stock/models/stock.model.js` (sur le modèle de `user.model.js`), puis
   l'ajouter dans `modules/stock/models/index.js`.
3. Schémas Zod : `stock.schemas.js` (ou dans `shared/` s'ils servent aussi au Front-End).
4. Service : `stock.service.js` (logique métier, erreurs de `core/errors`).
5. Contrôleur : `stock.controller.js` (avec `sendSuccess` / `sendCreated`).
6. Routes : `stock.routes.js` avec `authenticate`, `requirePermission`, `validate` et la documentation `@openapi`.
7. Branchement : décommenter/ajouter la ligne dans `registerRoutes()` de `modules/stock/index.js`.
8. Tests : `backend/tests/unit/stock/` et `backend/tests/integration/stock.test.js`
   (voir `tests/integration/auth.test.js` et les helpers de `tests/helpers/`).
9. Mettre à jour `docs/API.md`.

**Front-End**

1. Appels API : `frontend/src/features/stock/api/stockApi.js` (avec `httpClient`).
2. Pages et composants : `frontend/src/features/stock/pages/`, `components/`.
3. Routes : remplacer la page provisoire dans `frontend/src/features/stock/routes.jsx`.
4. Tests : à côté du composant (`StockPage.test.jsx`), avec `renderWithProviders`.

## 7. Définition de « terminé »

Une tâche est terminée quand : le code est dans `develop` via une PR approuvée, la CI est verte, les tests
couvrent le cas nominal et les erreurs, la route est documentée (Swagger + `docs/API.md`) et la fonctionnalité
a été vérifiée dans l'application.
