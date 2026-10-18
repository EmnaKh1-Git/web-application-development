import { z } from '@smart-ecommerce/shared';
import { describe, expect, it, vi } from 'vitest';
import { ValidationError } from '../../../src/core/errors/index.js';
import { validate } from '../../../src/core/middlewares/validate.js';

describe('validate()', () => {
  const middleware = validate({
    params: z.object({ id: z.coerce.number().int().positive() }),
    query: z.object({ page: z.coerce.number().int().default(1) }),
    body: z.object({ name: z.string().trim().min(2) }),
  });

  it('remplace params, query et body par les données validées et converties', () => {
    const req = { params: { id: '42' }, query: {}, body: { name: '  Clavier  ', role: 'ADMIN' } };
    const next = vi.fn();

    middleware(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.params).toEqual({ id: 42 });
    expect(req.query).toEqual({ page: 1 });
    expect(req.body).toEqual({ name: 'Clavier' }); // champ inconnu « role » retiré
  });

  it('fonctionne quand req.query est en lecture seule (Express 5)', () => {
    const req = { params: { id: '1' }, body: { name: 'Souris' } };
    Object.defineProperty(req, 'query', { get: () => ({ page: '3' }), configurable: true });

    middleware(req, {}, vi.fn());

    expect(req.query).toEqual({ page: 3 });
  });

  it('transmet une ValidationError détaillant chaque champ invalide', () => {
    const req = { params: { id: 'abc' }, query: {}, body: {} };
    const next = vi.fn();

    middleware(req, {}, next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.details).toEqual([
      { field: 'id', location: 'params', message: expect.any(String) },
      { field: 'name', location: 'body', message: expect.any(String) },
    ]);
  });

  it('produit des messages d’erreur en français', () => {
    const next = vi.fn();

    validate({ body: z.object({ name: z.string() }) })({ body: {} }, {}, next);

    expect(next.mock.calls[0][0].details[0].message).toMatch(/chaîne de caractères/);
  });
});
