import { ROLES } from '@smart-ecommerce/shared';
import { signAccessToken } from '../../src/core/security/jwt.js';
import { hashPassword } from '../../src/core/security/password.js';
import { models } from '../../src/database/index.js';

export const DEFAULT_TEST_PASSWORD = 'Password123';

let sequence = 0;

/** Crée un utilisateur en base (CLIENT actif par défaut). */
export async function createTestUser({
  role = ROLES.CLIENT,
  isActive = true,
  password = DEFAULT_TEST_PASSWORD,
  email,
} = {}) {
  sequence += 1;
  const roleRecord = await models.Role.findOne({ where: { name: role } });
  const user = await models.User.create({
    firstName: 'Test',
    lastName: `Utilisateur${sequence}`,
    email: email ?? `user${sequence}-${Date.now()}@test.local`,
    passwordHash: await hashPassword(password),
    roleId: roleRecord.id,
    isActive,
  });
  return { user, password };
}

/** Crée un utilisateur et son jeton JWT, prêt pour l'en-tête Authorization. */
export async function createAuthenticatedUser(options = {}) {
  const { user, password } = await createTestUser(options);
  const role = options.role ?? ROLES.CLIENT;
  const token = signAccessToken({ id: user.id, role });
  return { user, password, token, authHeader: `Bearer ${token}` };
}

export async function createTestCategory({ name } = {}) {
  sequence += 1;
  return models.Category.create({
    name: name ?? `Catégorie ${sequence}`,
    slug: `categorie-${sequence}-${Date.now()}`,
  });
}

/** Crée un produit actif avec son stock (10 unités, seuil 5 par défaut). */
export async function createTestProduct({
  name,
  price = 100,
  quantity = 10,
  lowStockThreshold = 5,
  isActive = true,
  categoryId,
  sizes = [],
  colors = [],
} = {}) {
  sequence += 1;
  const category = categoryId ? { id: categoryId } : await createTestCategory();
  const product = await models.Product.create({
    categoryId: category.id,
    name: name ?? `Produit ${sequence}`,
    slug: `produit-${sequence}-${Date.now()}`,
    description: 'Description du produit de test.',
    price,
    isActive,
    sizes,
    colors,
  });
  await models.Stock.create({ productId: product.id, quantity, lowStockThreshold });
  return product;
}

export function createTestAddress(userId, overrides = {}) {
  return models.Address.create({
    userId,
    label: 'Maison',
    street: '12 rue de la République',
    city: 'Tunis',
    postalCode: '1001',
    country: 'Tunisie',
    isDefault: true,
    ...overrides,
  });
}
