// Historique de ventes de démonstration (6 mois) : utilisé par les modèles d'IA
// (prévision de la demande, recommandations, segmentation des clients...).

/** Raison des réassorts générés (permet aussi de les retrouver pour annuler le seeder). */
export const RESTOCK_REASON = 'Réassort fournisseur';
/** Régularisation finale : l'historique se termine exactement au stock actuel. */
export const BALANCE_REASON = 'Régularisation d’inventaire';
/** Marqueur interne des commandes générées (non affiché dans l'interface). */
export const HISTORY_MARKER = 'historique';

/**
 * Comportement d'achat des clients (« demo » = compte client de démonstration).
 * weight = fréquence d'achat relative ; activeFrom / activeUntil = période d'activité (jours avant aujourd'hui).
 * Profils variés pour la segmentation RFM : champion, fidèle, gros acheteur, nouveau, à risque, inactif.
 */
export const CLIENT_PROFILES = {
  demo: { weight: 1.2, activeFrom: 175, activeUntil: 0 },
  'amine.benali@demo.test': { weight: 2.6, activeFrom: 178, activeUntil: 0 },
  'salma.trabelsi@demo.test': { weight: 1.4, activeFrom: 170, activeUntil: 2 },
  'youssef.gharbi@demo.test': { weight: 1.8, activeFrom: 175, activeUntil: 75 },
  'mariem.jaziri@demo.test': { weight: 0.7, activeFrom: 160, activeUntil: 6, premium: true },
  'ahmed.mansour@demo.test': { weight: 0.35, activeFrom: 150, activeUntil: 20 },
  'ines.bouaziz@demo.test': { weight: 1.3, activeFrom: 28, activeUntil: 0 },
  'karim.haddad@demo.test': { weight: 1.1, activeFrom: 172, activeUntil: 120 },
  'nour.chaabane@demo.test': { weight: 0.9, activeFrom: 140, activeUntil: 4 },
};

/** Produits souvent achetés ensemble (signal des recommandations « co-achats »). */
export const AFFINITIES = [
  ['Apple iPhone 13 Pro 128 Go', 'Écouteurs sans fil Beats Flex'],
  ['Samsung Galaxy S10', 'Écouteurs sans fil Beats Flex'],
  ['Realme XT 128 Go', 'Enceinte connectée Amazon Echo Plus'],
  ['Apple MacBook Pro 14 pouces', 'Casque Apple AirPods Max'],
  ['Dell XPS 13 9300', 'Fauteuil de bureau Knoll Saarinen'],
  ['Apple iPad mini 2021', 'Clean Code — Robert C. Martin'],
  ['Raquette de tennis', 'Lot de 3 balles de tennis'],
  ['Ballon de basketball', 'Panier de basket mural'],
  ['Ballon de football taille 5', 'Baskets Puma Future Rider'],
  ['Robe d’été fille', 'Lunettes de soleil classiques'],
  ['Robe de soirée noire', 'Eau de parfum Dior J’adore 100 ml'],
  ['Chemise à carreaux homme', 'Montre bracelet cuir marron'],
  ['Mascara Essence Lash Princess', 'Palette de fards à paupières'],
  ['Rouge à lèvres rouge intense', 'Vernis à ongles rouge'],
  ['Le Petit Prince — Antoine de Saint-Exupéry', 'L’Étranger — Albert Camus'],
  ['Clean Code — Robert C. Martin', 'Introduction à l’intelligence artificielle'],
  ['Blender 1,5 L', 'Wok en acier carbone 32 cm'],
  ['Canapé 3 places Annibale Colombo', 'Lampe de table design'],
  ['Pot de fleurs en céramique', 'Cadre photo arbre généalogique'],
];

/** Produits arrivés récemment dans le catalogue (historique court). */
export const RECENT_PRODUCTS = [
  'Baskets Puma Future Rider',
  'Apple Watch Series 4',
  'Lunettes de soleil classiques',
  'Sapiens — Yuval Noah Harari',
];

/** Phrases d'avis par rayon : points positifs et négatifs (le résumé IA les regroupe par aspect). */
export const REVIEW_PHRASES = {
  'high-tech': {
    positive: [
      'L’autonomie de la batterie est excellente',
      'L’écran est superbe et très lumineux',
      'Très rapide et fluide au quotidien',
      'Le son est clair et puissant',
      'Livraison rapide et colis bien emballé',
      'Excellent rapport qualité prix',
    ],
    negative: [
      'La batterie se décharge trop vite',
      'Un peu cher pour ce que c’est',
      'Le chargeur n’est pas fourni, dommage',
      'Il chauffe en utilisation intensive',
      'Livraison en retard de plusieurs jours',
    ],
  },
  maison: {
    positive: [
      'Très joli dans mon salon, design réussi',
      'Bonne qualité de fabrication, c’est solide',
      'Facile à monter en quelques minutes',
      'Correspond parfaitement à la photo',
      'Très pratique au quotidien',
    ],
    negative: [
      'Le montage est compliqué, notice peu claire',
      'Les finitions sont décevantes',
      'Plus petit que prévu',
      'Colis arrivé abîmé, emballage insuffisant',
    ],
  },
  sport: {
    positive: [
      'Très bonne prise en main',
      'Solide et résistant même après des semaines d’entraînement',
      'Parfait pour l’entraînement',
      'Excellent rapport qualité prix',
      'Léger et agréable à utiliser',
    ],
    negative: [
      'Il s’use assez vite',
      'Un peu lourd à mon goût',
      'Taille trop petite par rapport au guide',
      'Livraison en retard',
    ],
  },
  mode: {
    positive: [
      'La taille correspond bien',
      'Le tissu est doux et de très bonne qualité',
      'Très confortable à porter toute la journée',
      'Très élégant, je reçois beaucoup de compliments',
      'Les couleurs sont belles et fidèles à la photo',
    ],
    negative: [
      'Taille un peu petite, prenez une taille au-dessus',
      'La couleur est différente de la photo',
      'Le tissu se froisse facilement',
      'Les coutures sont fragiles',
    ],
  },
  beaute: {
    positive: [
      'Le parfum tient toute la journée',
      'Texture agréable et douce pour la peau',
      'Les couleurs sont magnifiques',
      'Très bon rapport qualité prix',
      'Livraison rapide et flacon bien emballé',
    ],
    negative: [
      'L’odeur est un peu forte',
      'La tenue est décevante, il faut en remettre',
      'Le flacon est plus petit que prévu',
      'Un peu cher pour la quantité',
    ],
  },
  livres: {
    positive: [
      'Une lecture passionnante du début à la fin',
      'Très bien écrit et facile à lire',
      'Livre reçu en parfait état',
      'Je le recommande vivement',
    ],
    negative: [
      'Quelques pages abîmées à la livraison',
      'Un peu long et difficile par moments',
      'La police est trop petite',
    ],
  },
};

/** Réclamations récentes variées, encore à traiter (démonstration du tri automatique par l'IA). */
export const EXTRA_COMPLAINTS = [
  {
    customer: 'amine.benali@demo.test',
    subject: 'Colis toujours pas reçu !!',
    description:
      'Ma commande devait arriver il y a une semaine et je n’ai toujours rien reçu. Le transporteur ne répond pas, c’est inadmissible. C’était un cadeau d’anniversaire, merci de me répondre rapidement.',
    daysAgo: 6,
    withOrder: true,
  },
  {
    customer: 'salma.trabelsi@demo.test',
    subject: 'Flacon de parfum cassé',
    description:
      'Le flacon est arrivé cassé et le parfum a coulé dans tout le colis. Je souhaite un remplacement ou un remboursement.',
    daysAgo: 3,
    withOrder: true,
  },
  {
    customer: 'nour.chaabane@demo.test',
    subject: 'Mauvaise taille livrée',
    description:
      'J’ai commandé une robe en taille S et j’ai reçu une taille L. Comment faire pour l’échanger ?',
    daysAgo: 2,
    withOrder: true,
  },
  {
    customer: 'mariem.jaziri@demo.test',
    subject: 'Remboursement non reçu depuis 15 jours',
    description:
      'J’ai annulé une commande il y a quinze jours et je ne suis toujours pas remboursée. C’est la dernière fois que je commande si rien ne bouge, c’est scandaleux.',
    daysAgo: 9,
    withOrder: false,
  },
  {
    customer: 'ines.bouaziz@demo.test',
    subject: 'Impossible de modifier mon adresse',
    description:
      'Sur le site, la page de mon compte affiche une erreur quand j’essaie de modifier mon adresse de livraison.',
    daysAgo: 1,
    withOrder: false,
  },
  {
    customer: 'ahmed.mansour@demo.test',
    subject: 'Écouteurs qui ne fonctionnent plus',
    description:
      'Après seulement deux semaines, l’écouteur gauche ne fonctionne plus du tout. Le produit semble défectueux.',
    daysAgo: 4,
    withOrder: true,
  },
];

/**
 * Commandes en attente inhabituelles : démonstration du score de risque (à vérifier avant confirmation).
 * lines = [nom du produit, quantité] ; city = ville de livraison inhabituelle pour ce client.
 */
export const SUSPICIOUS_ORDERS = [
  {
    customer: 'karim.haddad@demo.test',
    hoursAgo: 3,
    city: 'Sfax',
    street: '14 avenue Habib Bourguiba',
    postalCode: '3000',
    lines: [
      ['Apple MacBook Pro 14 pouces', 1],
      ['Apple iPhone 13 Pro 128 Go', 1],
      ['Écouteurs sans fil Beats Flex', 4],
    ],
  },
  {
    customer: 'ines.bouaziz@demo.test',
    hoursAgo: 7,
    lines: [['Sac à main Prada', 1]],
  },
];
