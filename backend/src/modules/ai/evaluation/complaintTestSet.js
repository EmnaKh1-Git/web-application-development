import { COMPLAINT_CATEGORY } from '@smart-ecommerce/shared';

/*
 * Jeu de test étiqueté à la main pour mesurer la précision du classement des réclamations.
 * Formulations variées (familières, longues, avec fautes d'accents) qui ne reprennent pas
 * mot pour mot les exemples de la base de démonstration.
 */
export const COMPLAINT_TEST_SET = [
  {
    subject: 'Colis jamais arrivé',
    description:
      'Le suivi indique livré mais je n’ai rien reçu à mon domicile, personne n’a sonné.',
    expected: COMPLAINT_CATEGORY.DELIVERY,
  },
  {
    subject: 'Retard de livraison',
    description: 'Commande passée il y a dix jours et toujours en attente du transporteur.',
    expected: COMPLAINT_CATEGORY.DELIVERY,
  },
  {
    subject: 'Livreur injoignable',
    description: 'Impossible de joindre le livreur, le colis est reparti au dépôt.',
    expected: COMPLAINT_CATEGORY.DELIVERY,
  },
  {
    subject: 'Ecran fissuré à l’ouverture',
    description: 'La tablette est arrivée avec l’écran fissuré, elle est inutilisable.',
    expected: COMPLAINT_CATEGORY.DEFECTIVE,
  },
  {
    subject: 'Ne fonctionne pas',
    description: 'Le blender ne s’allume pas du tout, même branché sur une autre prise.',
    expected: COMPLAINT_CATEGORY.DEFECTIVE,
  },
  {
    subject: 'Produit abîmé',
    description: 'Le pot de fleurs est cassé en deux morceaux, l’emballage était insuffisant.',
    expected: COMPLAINT_CATEGORY.DEFECTIVE,
  },
  {
    subject: 'Couture déchirée',
    description:
      'Après un seul lavage la chemise est déchirée au niveau de l’épaule, quel défaut de qualité.',
    expected: COMPLAINT_CATEGORY.DEFECTIVE,
  },
  {
    subject: 'Mauvaise taille reçue',
    description: 'J’ai commandé une robe en M et j’ai reçu du XL.',
    expected: COMPLAINT_CATEGORY.WRONG_ITEM,
  },
  {
    subject: 'Article manquant',
    description: 'Il manque les balles de tennis dans mon colis, seule la raquette était dedans.',
    expected: COMPLAINT_CATEGORY.WRONG_ITEM,
  },
  {
    subject: 'Pas le bon produit',
    description: 'Je reçois un parfum différent de celui commandé, ce n’est pas le bon flacon.',
    expected: COMPLAINT_CATEGORY.WRONG_ITEM,
  },
  {
    subject: 'Demande de remboursement',
    description: 'J’ai annulé ma commande avant expédition, quand serai-je remboursé ?',
    expected: COMPLAINT_CATEGORY.REFUND,
  },
  {
    subject: 'Débité deux fois',
    description: 'Le paiement a été débité en double sur ma carte, merci de rectifier.',
    expected: COMPLAINT_CATEGORY.REFUND,
  },
  {
    subject: 'Facture introuvable',
    description: 'Je n’ai pas reçu ma facture et le prix payé ne correspond pas.',
    expected: COMPLAINT_CATEGORY.REFUND,
  },
  {
    subject: 'Impossible de me connecter',
    description: 'Le site affiche une erreur quand je saisis mon mot de passe.',
    expected: COMPLAINT_CATEGORY.ACCOUNT,
  },
  {
    subject: 'Bug sur la page panier',
    description: 'La page du panier reste blanche sur l’application mobile.',
    expected: COMPLAINT_CATEGORY.ACCOUNT,
  },
  {
    subject: 'Changer mon email',
    description: 'Je souhaite modifier l’adresse email de mon compte client.',
    expected: COMPLAINT_CATEGORY.ACCOUNT,
  },
];
