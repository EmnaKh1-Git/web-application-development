## Description

<!-- Quoi ? Pourquoi ? Lien vers la tâche ou l'issue. -->

## Module concerné

- [ ] Utilisateurs / Authentification (Fares)
- [ ] Produits & Catégories (Emna)
- [ ] Panier, Commandes & Livraison (Oussama)
- [ ] Avis & Réclamations (Hajer)
- [ ] Stock (Yassine)
- [ ] Commun : `core/`, `shared/`, configuration, CI (**2 relecteurs requis**)

## Comment tester

1.

## Checklist

- [ ] `npm run lint` et `npm test` passent en local
- [ ] Tests ajoutés : cas nominal + erreurs (400, 401, 403, 404...)
- [ ] Données validées avec Zod côté Back-End (et côté Front-End pour les formulaires)
- [ ] Routes protégées (`authenticate` + `requirePermission`) et contrôle du propriétaire si nécessaire
- [ ] Aucun secret (clé d'API, mot de passe, jeton) dans le code
- [ ] Nouvelle migration si le schéma change (aucune migration existante modifiée)
- [ ] Nouvelles routes documentées (`@openapi`) et `docs/API.md` mis à jour
- [ ] Captures d'écran si l'interface change
