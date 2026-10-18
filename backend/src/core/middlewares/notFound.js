import { NotFoundError } from '../errors/index.js';

/** Route inconnue : 404 au format standard de l'API. */
export function notFound(req, _res, next) {
  next(
    new NotFoundError(`Route introuvable : ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'),
  );
}
