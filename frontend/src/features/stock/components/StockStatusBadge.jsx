import { STOCK_STATUS, STOCK_STATUS_LABELS } from '@smart-ecommerce/shared';
import { Badge } from '@/shared/components/ui/Badge';

const TONES = {
  [STOCK_STATUS.OK]: 'success',
  [STOCK_STATUS.LOW]: 'warning',
  [STOCK_STATUS.OUT]: 'danger',
};

/** État du stock d'un produit : En stock, Stock faible ou Rupture. */
export function StockStatusBadge({ status }) {
  return <Badge tone={TONES[status]}>{STOCK_STATUS_LABELS[status] ?? status}</Badge>;
}
