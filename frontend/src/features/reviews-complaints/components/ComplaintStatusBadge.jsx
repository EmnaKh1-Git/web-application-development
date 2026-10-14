import { COMPLAINT_STATUS, COMPLAINT_STATUS_LABELS } from '@smart-ecommerce/shared';
import { Badge } from '@/shared/components/ui/Badge';

const TONES = {
  [COMPLAINT_STATUS.OPEN]: 'warning',
  [COMPLAINT_STATUS.IN_PROGRESS]: 'info',
  [COMPLAINT_STATUS.RESOLVED]: 'success',
  [COMPLAINT_STATUS.REJECTED]: 'danger',
};

/** Statut d'une réclamation (libellés partagés avec le Back-End). */
export function ComplaintStatusBadge({ status }) {
  return <Badge tone={TONES[status]}>{COMPLAINT_STATUS_LABELS[status] ?? status}</Badge>;
}
