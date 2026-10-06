/**
 * Erreur « prévue » de l'application (ressource introuvable, accès refusé...).
 * Le middleware errorHandler la transforme en réponse HTTP :
 *
 *   { "success": false, "error": { "code": "...", "message": "...", "details": [...] } }
 *
 * - message    : texte lisible, affichable à l'utilisateur (en français)
 * - statusCode : code HTTP
 * - code       : identifiant stable en MAJUSCULES, utilisé par le Front-End
 * - details    : informations complémentaires (ex. erreurs de validation par champ)
 */
export class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}
