#!/bin/bash
# Exécuté UNE SEULE FOIS, au premier démarrage du conteneur MySQL (volume vide).
# Crée la base de test utilisée par les tests d'intégration du Back-End
# et donne les droits à l'utilisateur applicatif.
if [ -n "$DB_NAME_TEST" ]; then
  mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<EOSQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME_TEST\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON \`$DB_NAME_TEST\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
EOSQL
fi
