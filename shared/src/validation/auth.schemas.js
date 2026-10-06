import { z } from '../zod.js';
import { personNameSchema } from './common.js';

/** Règles du mot de passe (bcrypt ne prend en compte que les 72 premiers octets). */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/** Email : espaces retirés et mis en minuscules avant la vérification du format. */
export const emailSchema = z
  .string({ error: "L'email est obligatoire" })
  .trim()
  .toLowerCase()
  .min(1, "L'email est obligatoire")
  .max(255, "L'email ne doit pas dépasser 255 caractères")
  .pipe(z.email('Adresse email invalide'));

/** Mot de passe d'un nouveau compte (règles de complexité). */
export const passwordSchema = z
  .string({ error: 'Le mot de passe est obligatoire' })
  .min(
    PASSWORD_MIN_LENGTH,
    `Le mot de passe doit contenir au moins ${PASSWORD_MIN_LENGTH} caractères`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Le mot de passe ne doit pas dépasser ${PASSWORD_MAX_LENGTH} caractères`,
  )
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/\d/, 'Le mot de passe doit contenir au moins un chiffre');

/** POST /auth/register */
export const registerSchema = z.object({
  firstName: personNameSchema('prénom'),
  lastName: personNameSchema('nom'),
  email: emailSchema,
  password: passwordSchema,
});

/** POST /auth/login (pas de règle de complexité : on vérifie seulement la présence). */
export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: 'Le mot de passe est obligatoire' })
    .min(1, 'Le mot de passe est obligatoire')
    .max(128, 'Le mot de passe est trop long'),
});
