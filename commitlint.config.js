// Messages de commit au format Conventional Commits, vérifiés à chaque commit (hook Husky).
// Exemples :
//   feat(stock): ajout des alertes de stock faible
//   fix(orders): restauration du stock à l'annulation
//   test(auth): tests de la connexion avec un compte bloqué
export default {
  extends: ['@commitlint/config-conventional'],
};
