import { Op, QueryTypes } from 'sequelize';
import { env } from '../../config/env.js';
import { hashPassword } from '../../core/security/password.js';

// Comptes de démonstration, un par rôle. Emails et mots de passe viennent du .env
// (variables SEED_*) : aucun identifiant n'est écrit dans le code.
const DEMO_ACCOUNTS = [
  {
    role: 'ADMIN',
    email: env.SEED_ADMIN_EMAIL,
    password: env.SEED_ADMIN_PASSWORD,
    firstName: 'Admin',
    lastName: 'SmartE',
  },
  {
    role: 'STOCK_MANAGER',
    email: env.SEED_STOCK_MANAGER_EMAIL,
    password: env.SEED_STOCK_MANAGER_PASSWORD,
    firstName: 'Gestionnaire',
    lastName: 'Stock',
  },
  {
    role: 'CLIENT',
    email: env.SEED_CLIENT_EMAIL,
    password: env.SEED_CLIENT_PASSWORD,
    firstName: 'Client',
    lastName: 'Démo',
  },
];

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function up({ context: queryInterface }) {
  const roles = await queryInterface.sequelize.query('SELECT id, name FROM roles', {
    type: QueryTypes.SELECT,
  });
  const roleIdByName = Object.fromEntries(roles.map((role) => [role.name, role.id]));

  const rows = [];
  for (const account of DEMO_ACCOUNTS) {
    if (!account.email || !account.password) {
      console.warn(`  compte ${account.role} ignoré : SEED_* non renseigné dans le .env`);
      continue;
    }
    rows.push({
      role_id: roleIdByName[account.role],
      first_name: account.firstName,
      last_name: account.lastName,
      email: account.email.toLowerCase(),
      password_hash: await hashPassword(account.password),
      is_active: true,
    });
  }

  if (rows.length > 0) {
    await queryInterface.bulkInsert('users', rows);
  }
}

/** @param {{ context: import('sequelize').QueryInterface }} params */
export async function down({ context: queryInterface }) {
  const emails = DEMO_ACCOUNTS.map((account) => account.email?.toLowerCase()).filter(Boolean);
  if (emails.length > 0) {
    await queryInterface.bulkDelete('users', { email: { [Op.in]: emails } });
  }
}
