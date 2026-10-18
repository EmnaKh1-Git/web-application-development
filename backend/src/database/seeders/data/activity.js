// Données de démonstration : clients, avis et réclamations (textes réalistes en français).

/** Clients de démonstration (mot de passe = SEED_CLIENT_PASSWORD du .env). */
export const DEMO_CLIENTS = [
  {
    firstName: 'Amine',
    lastName: 'Ben Ali',
    email: 'amine.benali@demo.test',
    phone: '+216 22 145 678',
    address: { street: '15 rue de Marseille', city: 'Tunis', postalCode: '1001' },
  },
  {
    firstName: 'Salma',
    lastName: 'Trabelsi',
    email: 'salma.trabelsi@demo.test',
    phone: '+216 55 310 942',
    address: { street: 'Route de Tunis, km 4', city: 'Sfax', postalCode: '3000' },
  },
  {
    firstName: 'Youssef',
    lastName: 'Gharbi',
    email: 'youssef.gharbi@demo.test',
    phone: '+216 98 774 120',
    address: { street: '12 avenue Léopold Senghor', city: 'Sousse', postalCode: '4000' },
  },
  {
    firstName: 'Mariem',
    lastName: 'Jaziri',
    email: 'mariem.jaziri@demo.test',
    phone: '+216 21 908 337',
    address: { street: '8 rue Ibn Khaldoun', city: 'Ariana', postalCode: '2080' },
  },
  {
    firstName: 'Ahmed',
    lastName: 'Mansour',
    email: 'ahmed.mansour@demo.test',
    phone: '+216 50 612 485',
    address: { street: '27 avenue Habib Thameur', city: 'Nabeul', postalCode: '8000' },
  },
  {
    firstName: 'Ines',
    lastName: 'Bouaziz',
    email: 'ines.bouaziz@demo.test',
    phone: '+216 23 457 019',
    address: { street: '4 rue de la Corniche', city: 'Monastir', postalCode: '5000' },
  },
  {
    firstName: 'Karim',
    lastName: 'Haddad',
    email: 'karim.haddad@demo.test',
    phone: '+216 97 230 864',
    address: { street: '19 rue d’Espagne', city: 'Bizerte', postalCode: '7000' },
  },
  {
    firstName: 'Nour',
    lastName: 'Chaabane',
    email: 'nour.chaabane@demo.test',
    phone: '+216 26 781 503',
    address: { street: '3 rue du Saf Saf', city: 'La Marsa', postalCode: '2070' },
  },
];

/** Adresses du compte client de démonstration (SEED_CLIENT_EMAIL). */
export const DEMO_CLIENT_ADDRESSES = [
  {
    label: 'Maison',
    street: '45 avenue de la Liberté',
    city: 'Tunis',
    postalCode: '1002',
    isDefault: true,
  },
  {
    label: 'Travail',
    street: 'Les Berges du Lac, immeuble Zénith, 3e étage',
    city: 'Tunis',
    postalCode: '1053',
    isDefault: false,
  },
];

export const CARRIERS = ['Aramex', 'Rapid-Poste', 'First Delivery', 'SmartE Express'];

/** Commentaires d'avis par note. */
export const REVIEW_COMMENTS = {
  5: [
    'Excellent produit, conforme à la description. Livraison rapide, je recommande !',
    'Parfait, la qualité est au rendez-vous. Je suis vraiment satisfait de mon achat.',
    'Très bon rapport qualité-prix, emballage soigné et produit impeccable.',
    'Superbe, exactement ce que je cherchais. Je commanderai à nouveau.',
  ],
  4: [
    'Bon produit dans l’ensemble, quelques petits détails à améliorer mais je suis content.',
    'Conforme à mes attentes, livraison dans les délais annoncés.',
    'Très bien, seul bémol : la notice est un peu succincte.',
  ],
  3: [
    'Correct sans plus, le produit fait le travail mais la finition est moyenne.',
    'Produit convenable, mais la livraison a pris un jour de plus que prévu.',
  ],
  2: ['Déçu : la qualité ne correspond pas tout à fait à la description du site.'],
  1: ['Produit arrivé abîmé, j’ai dû contacter le service client.'],
};

/**
 * Réclamations de démonstration.
 * `orderStatus` : statut de la commande du client à laquelle la réclamation est liée
 * (null = réclamation sans commande).
 */
export const DEMO_COMPLAINTS = [
  {
    customer: 'demo',
    orderStatus: 'DELIVERED',
    subject: 'Article arrivé endommagé',
    description:
      'Le carton était enfoncé à la livraison et l’un des articles présente une rayure visible sur le côté.',
    status: 'RESOLVED',
    adminResponse:
      'Nous sommes désolés pour ce désagrément. Un article de remplacement vous a été expédié, et le transporteur a été informé.',
  },
  {
    customer: 'demo',
    orderStatus: 'SHIPPED',
    subject: 'Délai de livraison dépassé',
    description:
      'Ma commande est indiquée comme expédiée depuis plusieurs jours mais le suivi ne bouge plus. Pouvez-vous vérifier ?',
    status: 'OPEN',
    adminResponse: null,
  },
  {
    customer: 1,
    orderStatus: 'DELIVERED',
    subject: 'Produit non conforme à la description',
    description:
      'La couleur reçue est légèrement différente de celle présentée sur la photo du site. Je souhaite un échange.',
    status: 'REJECTED',
    adminResponse:
      'Après vérification, le produit livré correspond bien à la référence commandée : les couleurs peuvent varier selon l’écran. Un retour reste possible sous 14 jours.',
  },
  {
    customer: 2,
    orderStatus: 'PENDING',
    subject: 'Changement d’adresse de livraison',
    description:
      'Ma commande n’est pas encore expédiée : est-il possible de la faire livrer à mon lieu de travail plutôt qu’à mon domicile ?',
    status: 'IN_PROGRESS',
    adminResponse:
      'Nous avons bien noté votre demande et mettons à jour l’adresse avant l’expédition.',
  },
  {
    customer: 4,
    orderStatus: null,
    subject: 'Impossible de modifier mon numéro de téléphone',
    description:
      'Lorsque je modifie mon numéro de téléphone dans mon compte, un message d’erreur apparaît. Merci de votre aide.',
    status: 'RESOLVED',
    adminResponse:
      'Le numéro doit contenir au moins 8 chiffres (ex. +216 20 123 456). Nous l’avons mis à jour pour vous.',
  },
  {
    customer: 6,
    orderStatus: 'DELIVERED',
    subject: 'Demande de facture',
    description:
      'Pourriez-vous m’envoyer la facture de ma dernière commande ? J’en ai besoin pour une note de frais.',
    status: 'OPEN',
    adminResponse: null,
  },
];
