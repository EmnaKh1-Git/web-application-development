import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';

const app = createApp();

describe('Infrastructure de l’API', () => {
  it('GET /api/v1/health indique que l’API et la base sont opérationnelles', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', database: 'up' } });
  });

  it('répond 404 ROUTE_NOT_FOUND au format standard pour une route inconnue', async () => {
    const res = await request(app).get('/api/v1/route-inexistante');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: expect.any(String) },
    });
  });

  it('répond 400 INVALID_JSON quand le corps n’est pas un JSON valide', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('ajoute les en-têtes de sécurité (helmet)', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
