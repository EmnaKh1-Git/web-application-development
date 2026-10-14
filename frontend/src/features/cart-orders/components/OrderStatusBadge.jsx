import {
  DELIVERY_STATUS,
  DELIVERY_STATUS_LABELS,
  ORDER_STATUS,
  ORDER_STATUS_LABELS,
} from '@smart-ecommerce/shared';
import { Badge } from '@/shared/components/ui/Badge';

const ORDER_TONES = {
  [ORDER_STATUS.PENDING]: 'warning',
  [ORDER_STATUS.CONFIRMED]: 'brand',
  [ORDER_STATUS.SHIPPED]: 'info',
  [ORDER_STATUS.DELIVERED]: 'success',
  [ORDER_STATUS.CANCELLED]: 'danger',
};

const DELIVERY_TONES = {
  [DELIVERY_STATUS.PENDING]: 'neutral',
  [DELIVERY_STATUS.IN_TRANSIT]: 'info',
  [DELIVERY_STATUS.DELIVERED]: 'success',
  [DELIVERY_STATUS.CANCELLED]: 'danger',
};

/** Statut d'une commande (libellés partagés avec le Back-End). */
export function OrderStatusBadge({ status }) {
  return <Badge tone={ORDER_TONES[status]}>{ORDER_STATUS_LABELS[status] ?? status}</Badge>;
}

/** Statut de la livraison d'une commande. */
export function DeliveryStatusBadge({ status }) {
  return <Badge tone={DELIVERY_TONES[status]}>{DELIVERY_STATUS_LABELS[status] ?? status}</Badge>;
}
