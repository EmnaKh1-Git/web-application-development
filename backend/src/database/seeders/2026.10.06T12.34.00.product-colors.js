import { QueryTypes } from 'sequelize';

const COLORS_BY_CATEGORY = {
  'high-tech': ['Noir', 'Blanc', 'Bleu'],
  maison: ['Blanc', 'Noir', 'Bois naturel'],
  sport: ['Noir', 'Bleu', 'Rouge'],
  mode: ['Noir', 'Blanc', 'Bleu', 'Rouge'],
  beaute: ['Rose', 'Rouge', 'Doré'],
  livres: ['Bleu', 'Rouge', 'Vert'],
};

export async function up({ context: queryInterface }) {
  const products = await queryInterface.sequelize.query(
    `SELECT p.id, c.slug AS category_slug
     FROM products p JOIN categories c ON c.id = p.category_id`,
    { type: QueryTypes.SELECT },
  );
  for (const product of products) {
    await queryInterface.sequelize.query('UPDATE products SET colors = :colors WHERE id = :id', {
      replacements: {
        id: product.id,
        colors: JSON.stringify(COLORS_BY_CATEGORY[product.category_slug] ?? ['Noir']),
      },
    });
  }
}

export async function down({ context: queryInterface }) {
  await queryInterface.sequelize.query('UPDATE products SET colors = JSON_ARRAY()');
}
