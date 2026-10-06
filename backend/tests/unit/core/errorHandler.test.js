import { z } from '@smart-ecommerce/shared';
import { UniqueConstraintError, ValidationErrorItem } from 'sequelize';
import { describe, expect, it, vi } from 'vitest';
import { ConflictError, NotFoundError } from '../../../src/core/errors/index.js';
import { errorHandler, toAppError } from '../../../src/core/middlewares/errorHandler.js';

function createResponse() {
  const res = { headersSent: false };
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const req = { method: 'GET', originalUrl: '/api/v1/test' };

describe('errorHandler', () => {
  it('transforme une AppError en réponse standard', () => {
    const res = createResponse();

    errorHandler(new NotFoundError('Produit introuvable', 'PRODUCT_NOT_FOUND'), req, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'PRODUCT_NOT_FOUND', message: 'Produit introuvable' },
    });
  });

  it('inclut les détails (ex. champs en conflit)', () => {
    const res = createResponse();
    const details = [{ field: 'email', message: 'déjà utilisé' }];

    errorHandler(new ConflictError('Conflit', 'DUPLICATE', details), req, res, vi.fn());

    expect(res.json.mock.calls[0][0].error.details).toEqual(details);
  });

  it('délègue à Express si la réponse est déjà partiellement envoyée', () => {
    const res = createResponse();
    res.headersSent = true;
    const next = vi.fn();
    const error = new Error('trop tard');

    errorHandler(error, req, res, next);

    expect(next).toHaveBeenCalledWith(error);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('toAppError', () => {
  it('convertit une ZodError en 400 VALIDATION_ERROR', () => {
    const result = z.object({ email: z.email() }).safeParse({ email: 'x' });

    const error = toAppError(result.error);

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details[0].field).toBe('email');
  });

  it('convertit une violation de contrainte unique Sequelize en 409 DUPLICATE_ENTRY', () => {
    const uniqueError = new UniqueConstraintError({
      errors: [new ValidationErrorItem('email must be unique', 'unique violation', 'email')],
    });

    const error = toAppError(uniqueError);

    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('DUPLICATE_ENTRY');
    expect(error.details).toEqual([{ field: 'email', message: 'Cette valeur est déjà utilisée' }]);
  });

  it('convertit une erreur inconnue en 500 INTERNAL_ERROR', () => {
    const error = toAppError(new TypeError('cannot read properties of undefined'));

    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL_ERROR');
  });

  it('convertit un JSON invalide (body-parser) en 400 INVALID_JSON', () => {
    const parseError = Object.assign(new SyntaxError('Unexpected token'), {
      type: 'entity.parse.failed',
    });

    expect(toAppError(parseError)).toMatchObject({ statusCode: 400, code: 'INVALID_JSON' });
  });
});
