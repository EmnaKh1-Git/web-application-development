// Catalogue de démonstration : 6 rayons, 50 produits.
// Photos : CDN de démonstration DummyJSON (images libres prévues pour les prototypes).
// Les livres n'ont pas de photo : l'interface affiche une couverture générée.
// `stock` = quantité FINALE souhaitée après les commandes de démonstration.

const image = (path) => `https://cdn.dummyjson.com/product-images/${path}/1.webp`;

export const DEMO_CATEGORIES = [
  {
    key: 'high-tech',
    name: 'High-tech',
    description: 'Smartphones, ordinateurs, audio et objets connectés.',
  },
  { key: 'maison', name: 'Maison', description: 'Mobilier, décoration et électroménager.' },
  { key: 'sport', name: 'Sport', description: 'Équipements et accessoires pour tous les sports.' },
  { key: 'mode', name: 'Mode', description: 'Vêtements, chaussures, sacs et accessoires.' },
  { key: 'beaute', name: 'Beauté', description: 'Maquillage, parfums et soins du corps.' },
  { key: 'livres', name: 'Livres', description: 'Romans, essais et livres techniques.' },
];

export const DEMO_PRODUCTS = [
  // ─── High-tech ───
  {
    category: 'high-tech',
    name: 'Apple iPhone 13 Pro 128 Go',
    price: 3499,
    stock: 8,
    image: image('smartphones/iphone-13-pro'),
    description:
      'Écran Super Retina XDR 6,1 pouces avec ProMotion, puce A15 Bionic et triple appareil photo 12 Mpx. Idéal pour la photo de nuit et la vidéo 4K.',
  },
  {
    category: 'high-tech',
    name: 'Samsung Galaxy S10',
    price: 1599,
    stock: 14,
    image: image('smartphones/samsung-galaxy-s10'),
    description:
      'Écran Dynamic AMOLED 6,1 pouces, triple capteur photo et charge sans fil inversée pour recharger vos accessoires.',
  },
  {
    category: 'high-tech',
    name: 'Realme XT 128 Go',
    price: 749,
    stock: 25,
    image: image('smartphones/realme-xt'),
    description:
      'Smartphone abordable avec capteur principal 64 Mpx, grande batterie de 4000 mAh et charge rapide 20 W.',
  },
  {
    category: 'high-tech',
    name: 'Apple MacBook Pro 14 pouces',
    price: 6999,
    stock: 3,
    lowStockThreshold: 4,
    image: image('laptops/apple-macbook-pro-14-inch-space-grey'),
    description:
      'Écran Liquid Retina XDR, puce Apple M1 Pro, 16 Go de mémoire et SSD 512 Go. Jusqu’à 17 heures d’autonomie.',
  },
  {
    category: 'high-tech',
    name: 'Dell XPS 13 9300',
    price: 4299,
    stock: 6,
    image: image('laptops/new-dell-xps-13-9300-laptop'),
    description:
      'Ultraportable 13,4 pouces bord à bord, processeur Intel Core i7, 16 Go de RAM et clavier rétroéclairé.',
  },
  {
    category: 'high-tech',
    name: 'Lenovo Yoga 920',
    price: 2899,
    stock: 9,
    image: image('laptops/lenovo-yoga-920'),
    description:
      'PC convertible 2-en-1 avec écran tactile 13,9 pouces pivotant à 360°, stylet compatible et châssis aluminium.',
  },
  {
    category: 'high-tech',
    name: 'Apple iPad mini 2021',
    price: 1999,
    stock: 11,
    image: image('tablets/ipad-mini-2021-starlight'),
    description:
      'Tablette compacte 8,3 pouces, puce A15 Bionic, compatible Apple Pencil (2e génération) et connecteur USB-C.',
  },
  {
    category: 'high-tech',
    name: 'Casque Apple AirPods Max',
    price: 1899,
    stock: 5,
    image: image('mobile-accessories/apple-airpods-max-silver'),
    description:
      'Casque sans fil avec réduction active du bruit, audio spatial et autonomie de 20 heures.',
  },
  {
    category: 'high-tech',
    name: 'Écouteurs sans fil Beats Flex',
    price: 249,
    stock: 40,
    image: image('mobile-accessories/beats-flex-wireless-earphones'),
    description:
      'Écouteurs Bluetooth tour de cou, embouts magnétiques et jusqu’à 12 heures d’écoute.',
  },
  {
    category: 'high-tech',
    name: 'Apple Watch Series 4',
    price: 899,
    stock: 12,
    image: image('mobile-accessories/apple-watch-series-4-gold'),
    description:
      'Montre connectée avec électrocardiogramme, détection des chutes et suivi complet de l’activité sportive.',
  },
  {
    category: 'high-tech',
    name: 'Enceinte connectée Amazon Echo Plus',
    price: 399,
    stock: 0,
    image: image('mobile-accessories/amazon-echo-plus'),
    description:
      'Enceinte intelligente au son à 360° avec assistant vocal et passerelle domotique intégrée.',
  },

  // ─── Maison ───
  {
    category: 'maison',
    name: 'Lampe de table design',
    price: 89.9,
    stock: 30,
    image: image('home-decoration/table-lamp'),
    description:
      'Lampe à poser avec abat-jour en tissu et pied en métal, parfaite pour un salon ou une chambre.',
  },
  {
    category: 'maison',
    name: 'Pot de fleurs en céramique',
    price: 34.9,
    stock: 50,
    image: image('home-decoration/plant-pot'),
    description:
      'Pot en céramique émaillée avec soucoupe, diamètre 20 cm, pour plantes d’intérieur.',
  },
  {
    category: 'maison',
    name: 'Cadre photo arbre généalogique',
    price: 49,
    stock: 4,
    image: image('home-decoration/family-tree-photo-frame'),
    description:
      'Cadre multi-photos en forme d’arbre pour exposer les souvenirs de toute la famille.',
  },
  {
    category: 'maison',
    name: 'Canapé 3 places Annibale Colombo',
    price: 2490,
    stock: 2,
    lowStockThreshold: 3,
    image: image('furniture/annibale-colombo-sofa'),
    description:
      'Canapé élégant au revêtement en tissu doux, assise profonde et pieds en bois massif.',
  },
  {
    category: 'maison',
    name: 'Table de chevet en merisier',
    price: 329,
    stock: 10,
    image: image('furniture/bedside-table-african-cherry'),
    description: 'Table de chevet en bois de merisier avec tiroir et étagère de rangement.',
  },
  {
    category: 'maison',
    name: 'Fauteuil de bureau Knoll Saarinen',
    price: 899,
    stock: 7,
    image: image('furniture/knoll-saarinen-executive-conference-chair'),
    description:
      'Fauteuil au design iconique, coque moulée et assise rembourrée pour un confort durable.',
  },
  {
    category: 'maison',
    name: 'Blender 1,5 L',
    price: 189,
    stock: 18,
    image: image('kitchen-accessories/boxed-blender'),
    description: 'Blender 600 W avec bol en verre de 1,5 litre, 2 vitesses et fonction pulse.',
  },
  {
    category: 'maison',
    name: 'Four micro-ondes 25 L',
    price: 329,
    stock: 9,
    image: image('kitchen-accessories/microwave-oven'),
    description: 'Micro-ondes 900 W avec gril, 10 programmes automatiques et plateau tournant.',
  },
  {
    category: 'maison',
    name: 'Wok en acier carbone 32 cm',
    price: 69.9,
    stock: 22,
    image: image('kitchen-accessories/carbon-steel-wok'),
    description:
      'Wok traditionnel compatible tous feux, idéal pour les cuissons rapides à haute température.',
  },

  // ─── Sport ───
  {
    category: 'sport',
    name: 'Ballon de football taille 5',
    price: 59.9,
    stock: 35,
    image: image('sports-accessories/football'),
    description: 'Ballon cousu main pour l’entraînement et les matchs, taille officielle 5.',
  },
  {
    category: 'sport',
    name: 'Ballon de basketball',
    price: 69.9,
    stock: 20,
    image: image('sports-accessories/basketball'),
    description: 'Ballon taille 7 au grip renforcé, pour terrain intérieur et extérieur.',
  },
  {
    category: 'sport',
    name: 'Raquette de tennis',
    price: 249,
    stock: 8,
    image: image('sports-accessories/tennis-racket'),
    description:
      'Raquette en graphite de 285 g, tamis de 100 pouces², adaptée aux joueurs réguliers.',
  },
  {
    category: 'sport',
    name: 'Lot de 3 balles de tennis',
    price: 19.9,
    stock: 60,
    image: image('sports-accessories/tennis-ball'),
    description: 'Tube de 3 balles pressurisées, homologuées pour toutes les surfaces.',
  },
  {
    category: 'sport',
    name: 'Ballon de volleyball',
    price: 54.9,
    stock: 15,
    image: image('sports-accessories/volleyball'),
    description: 'Ballon souple au toucher, idéal pour la plage comme pour la salle.',
  },
  {
    category: 'sport',
    name: 'Club de golf (fer 7)',
    price: 389,
    stock: 3,
    image: image('sports-accessories/iron-golf'),
    description:
      'Fer 7 polyvalent en acier, grip antidérapant, pour golfeurs débutants et confirmés.',
  },
  {
    category: 'sport',
    name: 'Panier de basket mural',
    price: 279,
    stock: 0,
    image: image('sports-accessories/basketball-rim'),
    description: 'Panneau et cercle de basket à fixer au mur, filet tous temps inclus.',
  },

  // ─── Mode ───
  {
    category: 'mode',
    name: 'Baskets Nike Air Jordan 1',
    price: 699,
    stock: 6,
    image: image('mens-shoes/nike-air-jordan-1-red-and-black'),
    description:
      'La basket mythique en cuir rouge et noir, semelle Air pour un amorti confortable.',
  },
  {
    category: 'mode',
    name: 'Baskets Puma Future Rider',
    price: 289,
    stock: 14,
    image: image('mens-shoes/puma-future-rider-trainers'),
    description: 'Baskets rétro légères avec semelle en mousse, parfaites au quotidien.',
  },
  {
    category: 'mode',
    name: 'Chemise à carreaux homme',
    price: 79.9,
    stock: 28,
    image: image('mens-shirts/man-plaid-shirt'),
    description: 'Chemise en coton à carreaux, coupe droite et manches longues.',
  },
  {
    category: 'mode',
    name: 'Robe d’été fille',
    price: 69.9,
    stock: 16,
    image: image('tops/girl-summer-dress'),
    description: 'Robe légère en coton aux couleurs vives, idéale pour les beaux jours.',
  },
  {
    category: 'mode',
    name: 'Robe de soirée noire',
    price: 259,
    stock: 5,
    image: image('womens-dresses/black-women%27s-gown'),
    description: 'Robe longue élégante en tissu fluide, pour vos soirées et cérémonies.',
  },
  {
    category: 'mode',
    name: 'Sac à main Prada',
    price: 3290,
    stock: 2,
    lowStockThreshold: 3,
    image: image('womens-bags/prada-women-bag'),
    description: 'Sac à main en cuir grainé, finitions dorées et bandoulière amovible.',
  },
  {
    category: 'mode',
    name: 'Sac à dos en simili-cuir blanc',
    price: 129,
    stock: 19,
    image: image('womens-bags/white-faux-leather-backpack'),
    description: 'Sac à dos citadin en simili-cuir, compartiment principal zippé et poche avant.',
  },
  {
    category: 'mode',
    name: 'Lunettes de soleil classiques',
    price: 99,
    stock: 24,
    image: image('sunglasses/classic-sun-glasses'),
    description: 'Monture intemporelle et verres teintés avec protection UV400.',
  },
  {
    category: 'mode',
    name: 'Montre bracelet cuir marron',
    price: 189,
    stock: 11,
    image: image('mens-watches/brown-leather-belt-watch'),
    description: 'Montre à quartz au cadran épuré, bracelet en cuir véritable marron.',
  },

  // ─── Beauté ───
  {
    category: 'beaute',
    name: 'Mascara Essence Lash Princess',
    price: 19.9,
    stock: 70,
    image: image('beauty/essence-mascara-lash-princess'),
    description: 'Mascara volume et longueur, brosse conique pour des cils intenses.',
  },
  {
    category: 'beaute',
    name: 'Palette de fards à paupières',
    price: 49.9,
    stock: 21,
    image: image('beauty/eyeshadow-palette-with-mirror'),
    description: 'Palette de 12 teintes mates et irisées avec miroir intégré.',
  },
  {
    category: 'beaute',
    name: 'Rouge à lèvres rouge intense',
    price: 29.9,
    stock: 45,
    image: image('beauty/red-lipstick'),
    description: 'Rouge à lèvres longue tenue au fini satiné, enrichi en beurre de karité.',
  },
  {
    category: 'beaute',
    name: 'Vernis à ongles rouge',
    price: 14.9,
    stock: 4,
    image: image('beauty/red-nail-polish'),
    description: 'Vernis brillant à séchage rapide, tenue jusqu’à 7 jours.',
  },
  {
    category: 'beaute',
    name: 'Eau de parfum Dior J’adore 100 ml',
    price: 489,
    stock: 7,
    image: image('fragrances/dior-j%27adore'),
    description: 'Parfum floral lumineux aux notes de jasmin et de rose de Damas.',
  },
  {
    category: 'beaute',
    name: 'Eau de parfum Chanel Coco Noir 100 ml',
    price: 529,
    stock: 0,
    image: image('fragrances/chanel-coco-noir-eau-de'),
    description: 'Parfum oriental élégant aux notes de patchouli, de rose et de santal.',
  },
  {
    category: 'beaute',
    name: 'Eau de toilette Calvin Klein CK One 200 ml',
    price: 219,
    stock: 13,
    image: image('fragrances/calvin-klein-ck-one'),
    description: 'Fragrance fraîche et mixte aux notes d’agrumes et de thé vert.',
  },
  {
    category: 'beaute',
    name: 'Gel douche Olay au beurre de karité',
    price: 24.9,
    stock: 55,
    image: image('skin-care/olay-ultra-moisture-shea-butter-body-wash'),
    description: 'Gel douche ultra-hydratant au beurre de karité pour une peau douce.',
  },

  // ─── Livres (couvertures générées par l'interface) ───
  {
    category: 'livres',
    name: 'Le Petit Prince — Antoine de Saint-Exupéry',
    price: 19.9,
    stock: 30,
    image: null,
    description:
      'Le conte poétique et philosophique le plus traduit au monde, illustré par l’auteur.',
  },
  {
    category: 'livres',
    name: 'L’Étranger — Albert Camus',
    price: 22.5,
    stock: 18,
    image: null,
    description: 'Le premier roman de Camus : l’histoire de Meursault, figure de l’absurde.',
  },
  {
    category: 'livres',
    name: 'Les Misérables (intégrale) — Victor Hugo',
    price: 39.9,
    stock: 9,
    image: null,
    description: 'Le grand roman de Victor Hugo, de Jean Valjean à Cosette, en édition intégrale.',
  },
  {
    category: 'livres',
    name: 'Clean Code — Robert C. Martin',
    price: 119,
    stock: 6,
    image: null,
    description:
      'Les bonnes pratiques pour écrire un code lisible et maintenable, avec de nombreux exemples.',
  },
  {
    category: 'livres',
    name: 'Introduction à l’intelligence artificielle',
    price: 89,
    stock: 12,
    image: null,
    description:
      'Les bases de l’IA expliquées simplement : apprentissage automatique, réseaux de neurones et usages.',
  },
  {
    category: 'livres',
    name: 'Sapiens — Yuval Noah Harari',
    price: 59,
    stock: 3,
    image: null,
    description:
      'Une brève histoire de l’humanité, des premiers humains à la révolution scientifique.',
  },
];
