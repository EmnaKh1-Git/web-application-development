import { describe, expect, it } from 'vitest';
import { loginSchema, passwordSchema, registerSchema } from '../src/index.js';

const validUser = {
  firstName: 'Emna',
  lastName: 'Trabelsi',
  email: 'emna@example.com',
  password: 'Motdepasse1',
};

describe('registerSchema', () => {
  it('accepte une inscription valide et normalise l’email', () => {
    const result = registerSchema.parse({ ...validUser, email: '  Emna@Example.COM ' });
    expect(result.email).toBe('emna@example.com');
  });

  it('retire les champs inconnus (ex. une tentative de choisir son rôle)', () => {
    const result = registerSchema.parse({ ...validUser, role: 'ADMIN' });
    expect(result).not.toHaveProperty('role');
  });

  it('refuse un email invalide avec un message en français', () => {
    const result = registerSchema.safeParse({ ...validUser, email: 'emna.example.com' });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe('Adresse email invalide');
  });

  it('signale les champs obligatoires manquants', () => {
    const result = registerSchema.safeParse({});
    const fields = result.error.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(['firstName', 'lastName', 'email', 'password']);
  });
});

describe('passwordSchema', () => {
  it.each([
    ['court1A', 'au moins 8 caractères'],
    ['motdepasse1', 'une majuscule'],
    ['MOTDEPASSE1', 'une minuscule'],
    ['Motdepasse', 'un chiffre'],
  ])('refuse « %s » (%s)', (password, expectedMessage) => {
    const result = passwordSchema.safeParse(password);
    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.message).join(' ')).toContain(expectedMessage);
  });

  it('refuse plus de 72 caractères (limite de bcrypt)', () => {
    expect(passwordSchema.safeParse(`Aa1${'x'.repeat(70)}`).success).toBe(false);
  });

  it('accepte un mot de passe conforme', () => {
    expect(passwordSchema.safeParse('Motdepasse1').success).toBe(true);
  });
});

describe('loginSchema', () => {
  it('n’applique pas les règles de complexité à la connexion', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true);
  });

  it('exige un mot de passe non vide', () => {
    expect(loginSchema.safeParse({ email: 'a@b.co', password: '' }).success).toBe(false);
  });
});
