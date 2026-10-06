import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { UnauthorizedError } from '../../../src/core/errors/index.js';
import { signAccessToken, verifyAccessToken } from '../../../src/core/security/jwt.js';
import { hashPassword, verifyPassword } from '../../../src/core/security/password.js';

describe('JWT', () => {
  it('signe puis vérifie un jeton (sub = id, role)', () => {
    const token = signAccessToken({ id: 12, role: 'ADMIN' });

    const payload = verifyAccessToken(token);

    expect(payload.sub).toBe('12');
    expect(payload.role).toBe('ADMIN');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it('rejette un jeton signé avec un autre secret (INVALID_TOKEN)', () => {
    const forged = jwt.sign({ role: 'ADMIN' }, 'un-autre-secret-de-plus-de-32-caracteres!!', {
      subject: '1',
    });

    expect(() => verifyAccessToken(forged)).toThrow(
      expect.objectContaining({ code: 'INVALID_TOKEN' }),
    );
  });

  it('rejette un jeton non signé (alg: none)', () => {
    const unsigned = jwt.sign({ role: 'ADMIN' }, null, { algorithm: 'none', subject: '1' });

    expect(() => verifyAccessToken(unsigned)).toThrow(UnauthorizedError);
  });

  it('rejette un jeton expiré (TOKEN_EXPIRED)', () => {
    const expired = jwt.sign(
      { role: 'CLIENT', exp: Math.floor(Date.now() / 1000) - 60 },
      process.env.JWT_SECRET,
      { subject: '1' },
    );

    expect(() => verifyAccessToken(expired)).toThrow(
      expect.objectContaining({ code: 'TOKEN_EXPIRED' }),
    );
  });
});

describe('Mots de passe (bcrypt)', () => {
  it('ne stocke jamais le mot de passe en clair et le vérifie correctement', async () => {
    const hash = await hashPassword('Motdepasse1');

    expect(hash).not.toContain('Motdepasse1');
    await expect(verifyPassword('Motdepasse1', hash)).resolves.toBe(true);
    await expect(verifyPassword('Mauvais1', hash)).resolves.toBe(false);
  });

  it('produit un hash différent à chaque fois (sel aléatoire)', async () => {
    const [first, second] = await Promise.all([hashPassword('Abcdef12'), hashPassword('Abcdef12')]);

    expect(first).not.toBe(second);
  });
});
