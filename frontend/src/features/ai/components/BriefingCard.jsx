import { PERMISSIONS } from '@smart-ecommerce/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Info,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '@/shared/auth/useAuth';
import { Spinner } from '@/shared/components/ui/Spinner';
import { cn } from '@/shared/utils/cn';
import { formatDateTime } from '@/shared/utils/format';
import { aiApi, aiKeys } from '../api/aiApi';
import { AiBadge } from './AiBadge';

const TONES = {
  good: { icon: CircleCheck, className: 'text-emerald-600', label: 'Bonne nouvelle' },
  info: { icon: Info, className: 'text-brand-600', label: 'Information' },
  warning: { icon: TriangleAlert, className: 'text-amber-600', label: 'À surveiller' },
  danger: { icon: CircleAlert, className: 'text-red-600', label: 'Urgent' },
};

/** Briefing du jour : constats calculés par l'IA selon les permissions de l'utilisateur. */
export function BriefingCard() {
  const { hasPermission } = useAuth();
  const enabled = hasPermission(PERMISSIONS.AI_INSIGHTS);
  const query = useQuery({ queryKey: aiKeys.briefing, queryFn: aiApi.briefing, enabled });
  if (!enabled) return null;

  return (
    <section
      aria-labelledby="briefing-title"
      className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-violet-200"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="briefing-title" className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles aria-hidden="true" className="size-5 text-violet-600" />
          Briefing du jour
        </h2>
        {query.data && <AiBadge source={query.data.source} />}
      </div>
      {query.isPending ? (
        <Spinner className="mt-4 text-brand-600" />
      ) : query.isError ? (
        <p className="mt-3 text-sm text-slate-500">Briefing indisponible pour le moment.</p>
      ) : (
        <>
          {query.data.narrative && (
            <p className="mt-3 text-sm leading-6 text-slate-700">{query.data.narrative}</p>
          )}
          {query.data.insights.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Rien de particulier à signaler aujourd’hui.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {query.data.insights.map((insight) => {
                const tone = TONES[insight.tone] ?? TONES.info;
                return (
                  <li key={insight.text} className="flex items-start gap-3 py-2.5 text-sm">
                    <tone.icon
                      aria-hidden="true"
                      className={cn('mt-0.5 size-4 shrink-0', tone.className)}
                    />
                    <span className="sr-only">{tone.label} :</span>
                    <p className="flex-1 text-slate-700">{insight.text}</p>
                    {insight.link && (
                      <Link
                        to={insight.link}
                        className="inline-flex shrink-0 items-center text-xs font-medium text-brand-700 hover:underline"
                      >
                        Voir
                        <ChevronRight aria-hidden="true" className="size-3" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-xs text-slate-400">
            Calculé le {formatDateTime(query.data.generatedAt)}
          </p>
        </>
      )}
    </section>
  );
}
