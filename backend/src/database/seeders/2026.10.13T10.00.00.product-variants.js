// Corrige les variantes de démonstration : le seeder « product-colors » donnait des couleurs
// à TOUS les produits (livres, parfums, ballons...). Seuls les produits réellement déclinés
// en plusieurs coloris en ont désormais, et les baskets reçoivent des pointures.

const COLORS_BY_PRODUCT = {
  'Apple iPhone 13 Pro 128 Go': ['Graphite', 'Argent', 'Or', 'Bleu alpin'],
  'Samsung Galaxy S10': ['Noir prisme', 'Blanc prisme', 'Vert prisme'],
  'Realme XT 128 Go': ['Bleu perle', 'Blanc perle'],
  'Apple iPad mini 2021': ['Gris sidéral', 'Rose', 'Violet', 'Lumière stellaire'],
  'Casque Apple AirPods Max': ['Gris sidéral', 'Argent', 'Bleu ciel', 'Rose', 'Vert'],
  'Écouteurs sans fil Beats Flex': ['Noir', 'Blanc', 'Bleu', 'Jaune'],
  'Apple Watch Series 4': ['Argent', 'Gris sidéral', 'Or'],
  'Lampe de table design': ['Noir', 'Blanc'],
  'Pot de fleurs en céramique': ['Blanc', 'Terracotta'],
  'Baskets Puma Future Rider': ['Blanc', 'Noir', 'Bleu marine'],
  'Chemise à carreaux homme': ['Rouge', 'Bleu', 'Vert'],
  'Robe d’été fille': ['Jaune', 'Rose', 'Bleu ciel'],
  'Lunettes de soleil classiques': ['Noir', 'Écaille'],
};

const SHOE_SIZES = ['39', '40', '41', '42', '43', '44', '45'];
const SHOES = ['Baskets Nike Air Jordan 1', 'Baskets Puma Future Rider'];

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  await sequelize.query('UPDATE products SET colors = JSON_ARRAY()');
  for (const [name, colors] of Object.entries(COLORS_BY_PRODUCT)) {
    await sequelize.query('UPDATE products SET colors = :colors WHERE name = :name', {
      replacements: { name, colors: JSON.stringify(colors) },
    });
  }
  await sequelize.query('UPDATE products SET sizes = :sizes WHERE name IN (:names)', {
    replacements: { sizes: JSON.stringify(SHOE_SIZES), names: SHOES },
  });
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  const { sequelize } = queryInterface;
  await sequelize.query('UPDATE products SET colors = JSON_ARRAY()');
  await sequelize.query('UPDATE products SET sizes = JSON_ARRAY() WHERE name IN (:names)', {
    replacements: { names: SHOES },
  });
}
