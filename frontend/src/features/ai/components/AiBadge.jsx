import { AI_SOURCE, AI_SOURCE_LABELS } from '@smart-ecommerce/shared';
import { Sparkles } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * Pastille signalant un contenu produit par l'IA, avec sa source (Claude ou IA locale).
 * @example <AiBadge source={data.source} />
 */
export function AiBadge({ source, label = 'IA', className }) {
  return (
    <span
      title={
        source === AI_SOURCE.CLAUDE
          ? 'Généré par Claude (modèle de langage d’Anthropic)'
          : 'Calculé par les algorithmes d’IA du serveur'
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-violet-700 ring-1 ring-violet-200 ring-inset',
        className,
      )}
    >
      <Sparkles aria-hidden="true" className="size-3" />
      {label}
      {source && <span className="font-normal text-violet-600">· {AI_SOURCE_LABELS[source]}</span>}
    </span>
  );
}
