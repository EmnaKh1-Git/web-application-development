// Crée les bases de données (développement + test) et l'utilisateur applicatif
// sur un serveur MySQL installé localement (WAMP, XAMPP, MySQL Server...).
//   npm run db:create
//
// Inutile avec Docker : le conteneur le fait lui-même au premier démarrage.
// Se connecte avec le compte administrateur DB_ROOT_USER / DB_ROOT_PASSWORD du .env
// (avec WAMP ou XAMPP : root, mot de passe vide par défaut).
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';

const databases = [env.DB_NAME, env.DB_NAME_TEST].filter(Boolean);

let connection;
try {
  connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_ROOT_USER,
    password: env.DB_ROOT_PASSWORD,
  });
} catch (error) {
  console.error(
    `Connexion impossible à MySQL (${env.DB_HOST}:${env.DB_PORT}) avec le compte « ${env.DB_ROOT_USER} » : ${error.message}\n` +
      'Vérifiez que MySQL est démarré et que DB_ROOT_USER / DB_ROOT_PASSWORD sont corrects dans backend/.env.',
  );
  process.exit(1);
}

try {
  for (const database of databases) {
    await connection.query(
      'CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
      [database],
    );
    console.log(`  base prête : ${database}`);
  }

  if (env.DB_USER !== env.DB_ROOT_USER) {
    await connection.query("CREATE USER IF NOT EXISTS ?@'%' IDENTIFIED BY ?", [
      env.DB_USER,
      env.DB_PASSWORD,
    ]);
    // Aligne le mot de passe sur le .env si l'utilisateur existait déjà.
    await connection.query("ALTER USER ?@'%' IDENTIFIED BY ?", [env.DB_USER, env.DB_PASSWORD]);
    for (const database of databases) {
      await connection.query("GRANT ALL PRIVILEGES ON ??.* TO ?@'%'", [database, env.DB_USER]);
    }
    console.log(`  utilisateur prêt : ${env.DB_USER} (droits sur ${databases.join(', ')})`);
  }
  console.log('Terminé. Étape suivante : npm run db:migrate');
} finally {
  await connection.end();
}
