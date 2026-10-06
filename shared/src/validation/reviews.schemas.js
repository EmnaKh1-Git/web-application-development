import { CLOSING_COMPLAINT_STATUSES, COMPLAINT_STATUS_LIST } from '../constants/complaints.js';
import { z } from '../zod.js';
import { idSchema, optionalNumber, optionalText } from './common.js';

/** POST /products/:productId/reviews et PATCH /reviews/:id */
export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: 'Choisissez une note' })
    .int('Choisissez une note entre 1 et 5')
    .min(1, 'Choisissez une note entre 1 et 5')
    .max(5, 'Choisissez une note entre 1 et 5'),
  comment: z
    .string({ error: 'Le commentaire est obligatoire' })
    .trim()
    .min(10, 'Le commentaire doit contenir au moins 10 caractères')
    .max(1000, 'Le commentaire ne doit pas dépasser 1000 caractères'),
});

/** POST /complaints */
export const complaintSchema = z.object({
  subject: z
    .string({ error: "L'objet est obligatoire" })
    .trim()
    .min(5, "L'objet doit contenir au moins 5 caractères")
    .max(150, "L'objet ne doit pas dépasser 150 caractères"),
  description: z
    .string({ error: 'La description est obligatoire' })
    .trim()
    .min(20, 'Décrivez le problème en au moins 20 caractères')
    .max(2000, 'La description ne doit pas dépasser 2000 caractères'),
  orderId: optionalNumber(idSchema),
});

/** PATCH /admin/complaints/:id — une réponse est obligatoire pour clôturer */
export const complaintHandlingSchema = z
  .object({
    status: z.enum(COMPLAINT_STATUS_LIST, { error: 'Statut de réclamation inconnu' }),
    adminResponse: optionalText(
      z.string().trim().max(2000, 'La réponse ne doit pas dépasser 2000 caractères'),
    ),
  })
  .refine(
    (values) =>
      !CLOSING_COMPLAINT_STATUSES.includes(values.status) ||
      (values.adminResponse?.length ?? 0) >= 5,
    {
      path: ['adminResponse'],
      message: 'Une réponse (au moins 5 caractères) est obligatoire pour clôturer la réclamation',
    },
  );
