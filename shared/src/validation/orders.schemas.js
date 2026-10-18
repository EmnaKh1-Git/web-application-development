import { MAX_CART_ITEM_QUANTITY, ORDER_STATUS_LIST } from '../constants/orders.js';
import { z } from '../zod.js';
import { idSchema, optionalText } from './common.js';

const cartQuantitySchema = z.coerce
  .number({ error: 'La quantité est obligatoire' })
  .int('Nombre entier attendu')
  .min(1, 'La quantité doit être au moins 1')
  .max(MAX_CART_ITEM_QUANTITY, `Maximum ${MAX_CART_ITEM_QUANTITY} exemplaires par produit`);

/** POST /cart/items */
export const addCartItemSchema = z.object({
  productId: idSchema,
  quantity: cartQuantitySchema.default(1),
  size: optionalText(z.string().trim().max(20)),
  color: optionalText(z.string().trim().max(40)),
});

/** PATCH /cart/items/:itemId */
export const updateCartItemSchema = z.object({
  quantity: cartQuantitySchema,
});

/** POST /orders — commande créée à partir du panier */
export const checkoutSchema = z.object({
  addressId: z.coerce
    .number({ error: 'Choisissez une adresse de livraison' })
    .int('Choisissez une adresse de livraison')
    .positive('Choisissez une adresse de livraison'),
  notes: optionalText(z.string().trim().max(500, 'La note ne doit pas dépasser 500 caractères')),
});

/** PATCH /admin/orders/:id/status */
export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUS_LIST, { error: 'Statut de commande inconnu' }),
});

/** PATCH /admin/orders/:id/delivery */
export const deliverySchema = z.object({
  carrier: optionalText(
    z.string().trim().max(100, 'Le transporteur ne doit pas dépasser 100 caractères'),
  ),
  trackingNumber: optionalText(
    z.string().trim().max(100, 'Le numéro de suivi ne doit pas dépasser 100 caractères'),
  ),
  estimatedDeliveryDate: optionalText(z.iso.date({ error: 'Date invalide (format AAAA-MM-JJ)' })),
});
