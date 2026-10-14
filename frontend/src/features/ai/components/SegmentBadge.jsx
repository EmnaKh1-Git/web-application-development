import { CUSTOMER_SEGMENT } from '@smart-ecommerce/shared';
import { Badge } from '@/shared/components/ui/Badge';
import { formatPrice } from '@/shared/utils/format';

const TONES = {
  [CUSTOMER_SEGMENT.CHAMPION]: 'success',
  [CUSTOMER_SEGMENT.LOYAL]: 'brand',
  [CUSTOMER_SEGMENT.BIG_SPENDER]: 'info',
  [CUSTOMER_SEGMENT.PROMISING]: 'info',
  [CUSTOMER_SEGMENT.NEW]: 'brand',
  [CUSTOMER_SEGMENT.AT_RISK]: 'warning',
  [CUSTOMER_SEGMENT.HIBERNATING]: 'neutral',
  [CUSTOMER_SEGMENT.NO_ORDER]: 'neutral',
};

/** Segment RFM d'un client ; le détail (commandes, montant, action conseillée) s'affiche au survol. */
export function SegmentBadge({ segment }) {
  const details = [
    `${segment.frequency} commande(s)`,
    segment.monetary > 0 && formatPrice(segment.monetary),
    segment.recencyDays !== null && `dernière il y a ${segment.recencyDays} j`,
    segment.activityTrend !== null &&
      segment.activityTrend !== undefined &&
      `rythme ${segment.activityTrend > 0 ? '+' : ''}${Math.round(segment.activityTrend * 100)} %`,
    `Conseil : ${segment.action}`,
  ].filter(Boolean);

  return (
    <span title={details.join(' · ')}>
      <Badge tone={TONES[segment.segment]}>{segment.label}</Badge>
    </span>
  );
}
