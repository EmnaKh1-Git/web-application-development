/**
 * Format de réponse unique de l'API (succès).
 * Les erreurs sont formatées par le middleware errorHandler.
 *
 *   { "success": true, "data": ..., "meta": { ... } }
 */
export function sendSuccess(res, data = null, { statusCode = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

/** 201 Created : à utiliser après la création d'une ressource (POST). */
export function sendCreated(res, data, { meta } = {}) {
  return sendSuccess(res, data, { statusCode: 201, meta });
}

/** 204 No Content : à utiliser après une suppression réussie (DELETE). */
export function sendNoContent(res) {
  return res.status(204).end();
}
