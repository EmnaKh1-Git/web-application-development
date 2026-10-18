import { literal, Op } from 'sequelize';
import { ConflictError, NotFoundError } from '../../core/errors/index.js';
import { uniqueSlug } from '../../core/utils/slug.js';
import { models } from '../../database/index.js';

const { Category, Product } = models;

// Nombre de produits ACTIFS par catégorie (affiché dans les filtres du catalogue)
const productCountAttribute = [
  literal(
    '(SELECT COUNT(*) FROM products AS p WHERE p.category_id = `Category`.`id` AND p.is_active = 1)',
  ),
  'productCount',
];

export function toCategoryResponse(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    productCount: Number(category.get('productCount') ?? 0),
  };
}

export async function listCategories() {
  const categories = await Category.findAll({
    attributes: { include: [productCountAttribute] },
    order: [['name', 'ASC']],
  });
  return categories.map(toCategoryResponse);
}

export async function getCategory(id) {
  const category = await Category.findByPk(id, {
    attributes: { include: [productCountAttribute] },
  });
  if (!category) throw new NotFoundError('Catégorie introuvable', 'CATEGORY_NOT_FOUND');
  return toCategoryResponse(category);
}

export async function createCategory({ name, description }) {
  await assertNameAvailable(name);
  const category = await Category.create({
    name,
    description,
    slug: await uniqueSlug(Category, name),
  });
  return getCategory(category.id);
}

export async function updateCategory(id, { name, description }) {
  const category = await Category.findByPk(id);
  if (!category) throw new NotFoundError('Catégorie introuvable', 'CATEGORY_NOT_FOUND');
  await assertNameAvailable(name, id);
  const slug =
    name === category.name ? category.slug : await uniqueSlug(Category, name, { excludeId: id });
  await category.update({ name, description, slug });
  return getCategory(id);
}

export async function deleteCategory(id) {
  const category = await Category.findByPk(id);
  if (!category) throw new NotFoundError('Catégorie introuvable', 'CATEGORY_NOT_FOUND');
  // Les produits désactivés comptent aussi : ils restent liés à l'historique des commandes.
  if ((await Product.count({ where: { categoryId: id } })) > 0) {
    throw new ConflictError(
      'Impossible de supprimer une catégorie qui contient des produits',
      'CATEGORY_NOT_EMPTY',
    );
  }
  await category.destroy();
}

async function assertNameAvailable(name, excludeId) {
  const where = { name, ...(excludeId && { id: { [Op.ne]: excludeId } }) };
  if ((await Category.count({ where })) > 0) {
    throw new ConflictError('Une catégorie porte déjà ce nom', 'CATEGORY_NAME_TAKEN', [
      { field: 'name', location: 'body', message: 'Une catégorie porte déjà ce nom' },
    ]);
  }
}
