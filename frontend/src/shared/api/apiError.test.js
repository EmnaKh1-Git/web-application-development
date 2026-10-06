import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './apiError';

describe('toApiError()', () => {
  it('reprend le code, le message et les détails renvoyés par l’API', () => {
    const axiosError = {
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Les données envoyées sont invalides',
            details: [{ field: 'email', message: 'Adresse email invalide' }],
          },
        },
      },
    };

    const error = toApiError(axiosError);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect(error.details).toHaveLength(1);
  });

  it('signale un serveur injoignable (NETWORK_ERROR)', () => {
    const error = toApiError({ code: 'ERR_NETWORK', message: 'Network Error' });

    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);
  });

  it('signale un délai dépassé (TIMEOUT)', () => {
    expect(toApiError({ code: 'ECONNABORTED' }).code).toBe('TIMEOUT');
  });

  it('gère une réponse d’erreur sans corps au format de l’API', () => {
    const error = toApiError({ response: { status: 502, data: '<html>Bad Gateway</html>' } });

    expect(error).toMatchObject({ status: 502, code: 'HTTP_ERROR' });
  });
});
