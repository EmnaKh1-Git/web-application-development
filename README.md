# SmartE-Commerce

Plateforme e-commerce web avec un module d'Intelligence Artificielle, réalisée dans le cadre du module
**« IA for Software Engineering »**.

Les utilisateurs peuvent consulter, rechercher, filtrer et trier les produits, gérer leur panier, commander,
suivre leurs livraisons, donner des avis et déposer des réclamations. L'**intelligence artificielle** est
présente dans toute l'application : prévision des ruptures de stock, réception intelligente des livraisons,
recommandations, assistant d'achat, résumé des avis, tri des réclamations, score de risque des commandes,
segmentation des clients et briefing du jour (voir [Intelligence artificielle](#intelligence-artificielle)).

## Équipe et modules

| Module                                | Responsable | Back-End                              | Front-End                                   |
| ------------------------------------- | ----------- | ------------------------------------- | ------------------------------------------- |
| Utilisateurs, authentification, rôles | Fares       | `backend/src/modules/auth/`, `users/` | `frontend/src/features/auth/`, `users/`     |
| Produits & catégories                 | Emna        | `backend/src/modules/products/`       | `frontend/src/features/products/`           |
| Panier, commandes & livraison         | Oussama     | `backend/src/modules/orders/`         | `frontend/src/features/cart-orders/`        |
| Avis & réclamations                   | Hajer       | `backend/src/modules/reviews/`        | `frontend/src/features/reviews-complaints/` |
| Stock                                 | Yassine     | `backend/src/modules/stock/`          | `frontend/src/features/stock/`              |
| Intelligence Artificielle             | Équipe      | `backend/src/modules/ai/`             | `frontend/src/features/ai/`                 |

## Stack technique

| Partie          | Technologies                                                                                        |
| --------------- | --------------------------------------------------------------------------------------------------- |
| Front-End       | React 19, Vite, React Router 7, Tailwind CSS 4, Axios, React Hook Form, Zod                         |
| Back-End        | Node.js, Express 5, API REST, JWT, bcrypt, helmet, CORS, rate limiting                              |
| IA              | Algorithmes locaux (prévision, recommandation, classification) + Claude (SDK Anthropic, facultatif) |
| Base de données | MySQL 8, Sequelize (ORM), migrations Umzug                                                          |
| Code partagé    | `@smart-ecommerce/shared` : rôles, permissions, schémas de validation Zod                           |
| Qualité         | Vitest, Supertest, Testing Library, ESLint, Prettier, Husky, commitlint                             |
| CI              | GitHub Actions (lint, tests avec MySQL, build)                                                      |

Tout le projet est en **JavaScript (ES Modules)**.

## Prérequis

- **Node.js 22 LTS** (22.13 ou plus récent) ou **Node.js 24** : `node -v`
- **Git**
- **Un serveur MySQL**, au choix :
  - **Docker Desktop** (recommandé : même version pour toute l'équipe) ;
  - ou un **MySQL local** : WAMP, XAMPP ou MySQL Server 8+.

## Installation (première fois)

```bash
npm install
```

```bash
npm run setup:env
```

`setup:env` crée `backend/.env` et `frontend/.env` à partir des fichiers `.env.example` et génère des
secrets aléatoires. Ces fichiers ne sont **jamais** versionnés.

### Base de données — option A : Docker (recommandé)

```bash
npm run db:up
```

Cette commande démarre MySQL 8.4 sur le port 3306, ainsi qu'Adminer (interface web) sur http://localhost:8080.
La base de test est créée automatiquement.

### Base de données — option B : MySQL local (WAMP, XAMPP...)

1. Démarrez MySQL (icône WAMP verte, ou bouton « Start » de XAMPP).
2. Dans `backend/.env`, mettez le mot de passe administrateur de MySQL dans `DB_ROOT_PASSWORD` :
   avec WAMP ou XAMPP, il est **vide** par défaut (`DB_ROOT_PASSWORD=`).
3. Créez les bases et l'utilisateur de l'application :

```bash
npm run db:create
```

### Tables, données de démonstration et démarrage

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

| Service                 | URL                                 |
| ----------------------- | ----------------------------------- |
| Application (Front-End) | http://localhost:5173               |
| API REST                | http://localhost:4000/api/v1        |
| Documentation Swagger   | http://localhost:4000/api/docs      |
| État de l'API           | http://localhost:4000/api/v1/health |
| Adminer (option Docker) | http://localhost:8080               |

**Comptes de démonstration** (un par rôle) : les emails et mots de passe sont dans `backend/.env`
(variables `SEED_*`).

## Commandes utiles (à la racine)

| Commande                       | Rôle                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| `npm run dev`                  | Lance l'API et le Front-End en parallèle                             |
| `npm test`                     | Tous les tests (shared, back-end unitaires + intégration, front-end) |
| `npm run test:backend`         | Tests du Back-End (MySQL nécessaire pour l'intégration)              |
| `npm run test:frontend`        | Tests du Front-End                                                   |
| `npm run test:jest -w backend` | Tests unitaires du module Stock avec Jest (inclus dans `npm test`)   |
| `npm run lint`                 | Vérifie le code avec ESLint                                          |
| `npm run format`               | Formate tout le code avec Prettier                                   |
| `npm run build`                | Build de production du Front-End                                     |
| `npm run db:migrate`           | Applique les migrations en attente                                   |
| `npm run db:seed`              | Insère les données de démonstration                                  |
| `npm run db:reset`             | Recrée entièrement la base de développement                          |
| `npm run db:up` / `db:down`    | Démarre / arrête MySQL dans Docker                                   |

Commandes de base de données avancées (depuis `backend/`) : `npm run db:migrate:status`,
`npm run db:migrate:undo`, `npm run db:migration:create -- create-products.js`, `npm run db:seed:status`.

## Structure du projet

```
smart-ecommerce/
├── backend/                 API REST Express (voir docs/ARCHITECTURE.md)
│   ├── src/
│   │   ├── config/          env (validé), connexion MySQL, Swagger
│   │   ├── core/            commun : erreurs, middlewares, sécurité, événements, utilitaires
│   │   ├── database/        registre des modèles, migrations, seeders
│   │   ├── modules/         un dossier par module métier (auth, users, products, orders, reviews, stock, ai)
│   │   ├── routes.js        routeur /api/v1 (chaque module branche ses routes)
│   │   ├── app.js           application Express
│   │   └── server.js        démarrage
│   └── tests/               unit/ (sans BDD) et integration/ (API + MySQL)
├── frontend/                application React
│   └── src/
│       ├── app/router.jsx   routes (chaque module déclare les siennes)
│       ├── features/        un dossier par module métier
│       └── shared/          API, session, composants, mises en page, pages communes
├── shared/                  rôles, permissions et schémas Zod communs Front/Back
├── docker/                  initialisation MySQL
├── docs/                    architecture et contrat d'API
└── .github/                 CI et modèle de pull request
```

## Intelligence artificielle

Toutes les fonctions d'IA marchent **sans configuration** grâce aux algorithmes du serveur. Le **Centre IA**
(back-office, `/admin/ai`) les présente, indique où les voir et affiche la qualité mesurée des modèles.

| Où la voir                                | Fonction                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------- |
| Boutique : accueil, fiche produit, panier | Recommandations expliquées (« Souvent acheté avec… »), tenant compte du stock         |
| Boutique : bouton « Assistant IA »        | Assistant d'achat : budget, idée cadeau, suivi de commande, questions sur la boutique |
| Fiche produit                             | « Ce qu'en pensent les clients » : résumé des avis                                    |
| Stock › Prévisions IA                     | Rupture prévue, quantité à commander, seuil d'alerte conseillé, courbes de prévision  |
| Stock › Réception intelligente            | Bon de livraison collé (ou photographié avec Claude) → produits reconnus → validation |
| Réclamations                              | Catégorie et priorité automatiques, brouillon de réponse                              |
| Commandes                                 | Score de risque expliqué, avant confirmation                                          |
| Utilisateurs                              | Segment de chaque client (RFM)                                                        |
| Produits                                  | Catégorie suggérée, description rédigée                                               |
| Tableau de bord                           | Briefing du jour                                                                      |

**Activer Claude (facultatif)** : ajoutez votre clé dans `backend/.env` (`ANTHROPIC_API_KEY=...`), puis
redémarrez l'API. Claude ajoute la lecture des photos de bons de livraison, la conversation libre de
l'assistant et des textes rédigés ; en cas de problème, l'application revient automatiquement à l'IA locale.

Les modèles s'appuient sur 6 mois d'historique de ventes générés par le seeder `sales-history`
(inclus dans `npm run db:seed`).

## Documentation

- [Guide de contribution](CONTRIBUTING.md) : workflow Git, conventions, ajout d'une fonctionnalité pas à pas
- [Architecture](docs/ARCHITECTURE.md) : choix techniques, modules, sécurité, tests, intégration de l'IA
- [API REST](docs/API.md) : format des réponses, codes d'erreur, permissions, routes de chaque module

## Avancement

- [x] **Sprint 0 — Fondations** : monorepo, structure Front/Back, MySQL + Sequelize, `core/`, configuration,
      authentification JWT (inscription, connexion, session), rôles et permissions, tests, CI
- [x] Sprint 1 — Modules de base : profil et adresses, produits (galerie, tailles, couleurs), catégories,
      stock (alertes, réapprovisionnement, inventaire, historique), panier, avis
- [x] Sprint 2 — Commandes (stock déduit à la confirmation), suivi de livraison, réclamations,
      back-office complet (tableau de bord, utilisateurs, produits, commandes, réclamations, stock)
- [ ] Sprint 3 — Intégration, qualité, sécurité
- [x] Sprint 4 — Intelligence Artificielle : prévisions, réception intelligente, recommandations, assistant,
      analyses (avis, réclamations, commandes, clients), Centre IA et évaluation des modèles
