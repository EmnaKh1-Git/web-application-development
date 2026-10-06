/**
 * Erreur normalisée renvoyée par tous les appels à l'API.
 * Reprend le format d'erreur du Back-End : { code, message, details }.
 *
 * @example
 * try { await authApi.login(values); }
 * catch (error) { if (error.code === 'INVALID_CREDENTIALS') ... }
 */
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN_ERROR', message, details = [] }) {
    super(message ?? 'Une erreur inattendue est survenue');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Convertit une erreur Axios (ou autre) en ApiError. */
export function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.response) {
    const apiError = error.response.data?.error;
    return new ApiError({
      status: error.response.status,
      code: apiError?.code ?? 'HTTP_ERROR',
      message: apiError?.message ?? 'Une erreur est survenue, veuillez réessayer',
      details: apiError?.details ?? [],
    });
  }

  if (error?.code === 'ECONNABORTED') {
    return new ApiError({ code: 'TIMEOUT', message: 'Le serveur met trop de temps à répondre' });
  }

  return new ApiError({
    code: 'NETWORK_ERROR',
    message: "Impossible de contacter le serveur. Vérifiez que l'API est démarrée.",
  });
}
