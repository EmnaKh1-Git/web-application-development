# language: fr
#
# Module Avis et réclamations (Hajer) — tests d'ACCEPTATION avec Cucumber.
# Règles métier écrites en langage naturel : Étant donné (Préparer) / Quand (Agir) / Alors (Vérifier).
# Exécutés sur l'API complète et la base MySQL de TEST (vidée avant chaque scénario), données fictives.
# Lancement : npm run test:acceptance -w backend

Fonctionnalité: Avis et réclamations
  Pour aider les autres clients et améliorer le service,
  un client peut donner son avis sur un produit qu'il a reçu
  et déposer une réclamation, à laquelle l'équipe répond.

  Contexte:
    Étant donné le produit « Lot de 3 balles de tennis » au catalogue

  # AT-01 — cas nominal
  Scénario: Une cliente livrée donne son avis et la note du produit est mise à jour
    Étant donné une cliente « Amel » dont la commande du produit est livrée
    Quand elle publie un avis 4 étoiles : « Très bonnes balles, rebond régulier »
    Alors l'avis est publié
    Et la note moyenne du produit est 4 sur 1 avis

  # AT-02 — cas d'erreur
  Scénario: Une cliente dont la commande n'est pas livrée ne peut pas donner d'avis
    Étant donné une cliente « Amel » dont la commande du produit est en attente
    Quand elle publie un avis 5 étoiles : « Je pense que ces balles seront parfaites »
    Alors l'avis est refusé avec le message « Vous pourrez donner votre avis après avoir reçu ce produit »
    Et le produit n'a toujours aucun avis

  # AT-03 — cas limite : 9 caractères refusés, 10 acceptés, un seul avis par produit
  Scénario: Le commentaire fait au moins 10 caractères et un seul avis est accepté par produit
    Étant donné une cliente « Amel » dont la commande du produit est livrée
    Quand elle publie un avis 5 étoiles : « Top top!! »
    Alors l'avis est refusé avec le message « Le commentaire doit contenir au moins 10 caractères »
    Quand elle publie un avis 5 étoiles : « Top top !! »
    Alors l'avis est publié
    Quand elle publie un avis 3 étoiles : « Finalement moins bien que prévu »
    Alors l'avis est refusé avec le message « Vous avez déjà donné votre avis sur ce produit »

  # AT-04 — cas d'erreur puis cas nominal
  Scénario: Une réclamation n'est clôturée qu'avec une réponse à la cliente
    Étant donné une cliente « Amel » ayant déposé la réclamation « Flacon de parfum cassé »
    Quand l'administrateur la passe à « Résolue » sans réponse
    Alors la clôture est refusée avec le message « Une réponse (au moins 5 caractères) est obligatoire pour clôturer la réclamation »
    Quand l'administrateur la passe à « Résolue » avec la réponse « Un nouveau flacon vous a été envoyé. »
    Alors la cliente voit sa réclamation « Résolue » avec la réponse « Un nouveau flacon vous a été envoyé. »

  # AT-05 — IA : l'IA externe (Claude) est indisponible, l'IA locale du serveur prend le relais
  Scénario: Le résumé des avis reste disponible quand l'IA externe est indisponible
    Étant donné que le produit a reçu ces avis de clients livrés :
      | note | commentaire                                         |
      | 5    | Le rebond est régulier et les balles sont solides.  |
      | 4    | Bonne qualité, livraison rapide, je recommande.     |
      | 2    | Les balles perdent leur pression beaucoup trop vite. |
    Et que l'IA externe Claude est indisponible
    Quand un visiteur demande le résumé des avis du produit
    Alors un résumé de 3 avis est produit par l'IA locale
    Et la note moyenne du résumé est 3,7 sur 5
