import { AI_LEVEL } from '@smart-ecommerce/shared';
import { CircleAlert, Sparkles, TriangleAlert } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';

const STYLES = {
  [AI_LEVEL.HIGH]: { tone: 'danger', icon: TriangleAlert },
  [AI_LEVEL.MEDIUM]: { tone: 'warning', icon: CircleAlert },
  [AI_LEVEL.LOW]: { tone: 'neutral', icon: Sparkles },
};

/**
 * Niveau calculé par l'IA (priorité d'une réclamation, risque d'une commande), avec une icône :
 * la couleur ne porte jamais seule le sens. Les raisons s'affichent au survol.
 *
 * @example <AiLevelBadge level={risk.level} labels={ORDER_RISK_LABELS} reasons={risk.reasons} />
 */
export function AiLevelBadge({ level, labels, reasons = [] }) {
  const { tone, icon: Icon } = STYLES[level] ?? STYLES[AI_LEVEL.LOW];
  return (
    <span title={reasons.length > 0 ? `Analyse IA : ${reasons.join(' · ')}` : undefined}>
      <Badge tone={tone}>
        <Icon aria-hidden="true" className="size-3" />
        {labels[level]}
      </Badge>
    </span>
  );
}
