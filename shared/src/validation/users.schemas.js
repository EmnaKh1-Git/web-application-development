import { ROLE_LIST } from '../constants/roles.js';
import { z } from '../zod.js';
import { passwordSchema } from './auth.schemas.js';
import { optionalText, personNameSchema, phoneSchema } from './common.js';

/** PATCH /users/me */
export const profileSchema = z.object({
  firstName: personNameSchema('prénom'),
  lastName: personNameSchema('nom'),
  phone: optionalText(phoneSchema),
});

/** PATCH /users/me/password */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ error: 'Le mot de passe actuel est obligatoire' })
      .min(1, 'Le mot de passe actuel est obligatoire')
      .max(128, 'Le mot de passe est trop long'),
    newPassword: passwordSchema,
  })
  .refine((values) => values.currentPassword !== values.newPassword, {
    path: ['newPassword'],
    message: "Le nouveau mot de passe doit être différent de l'ancien",
  });

/** POST et PATCH /users/me/addresses */
export const addressSchema = z.object({
  label: z
    .string({ error: 'Le libellé est obligatoire' })
    .trim()
    .min(2, 'Le libellé doit contenir au moins 2 caractères (ex. Maison)')
    .max(50, 'Le libellé ne doit pas dépasser 50 caractères'),
  street: z
    .string({ error: "L'adresse est obligatoire" })
    .trim()
    .min(5, "L'adresse doit contenir au moins 5 caractères")
    .max(255, "L'adresse ne doit pas dépasser 255 caractères"),
  city: z
    .string({ error: 'La ville est obligatoire' })
    .trim()
    .min(2, 'La ville doit contenir au moins 2 caractères')
    .max(100, 'La ville ne doit pas dépasser 100 caractères'),
  postalCode: z
    .string({ error: 'Le code postal est obligatoire' })
    .trim()
    .regex(/^[0-9A-Za-z -]{3,10}$/, 'Code postal invalide'),
  country: z
    .string()
    .trim()
    .min(2, 'Le pays doit contenir au moins 2 caractères')
    .max(100, 'Le pays ne doit pas dépasser 100 caractères')
    .default('Tunisie'),
  phone: optionalText(phoneSchema),
  isDefault: z.boolean().default(false),
});

/** PATCH /admin/users/:id/status */
export const userStatusSchema = z.object({
  isActive: z.boolean({ error: 'isActive doit valoir true ou false' }),
});

/** PATCH /admin/users/:id/role */
export const userRoleSchema = z.object({
  role: z.enum(ROLE_LIST, { error: 'Rôle inconnu' }),
});
