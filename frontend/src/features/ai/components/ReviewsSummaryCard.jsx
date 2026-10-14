import { useQuery } from '@tanstack/react-query';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { aiApi, aiKeys } from '../api/aiApi';
import { AiBadge } from './AiBadge';

/** « Ce qu'en pensent les clients » : synthèse des avis, points forts et points faibles. */
export function ReviewsSummaryCard({ productId }) {
  const query = useQuery({
    queryKey: aiKeys.reviewsSummary(productId),
    queryFn: () => aiApi.reviewsSummary(productId),
  });
  const summary = query.data;
  if (!summary?.available) return null;

  return (
    <section
      aria-labelledby="reviews-summary-title"
      className="rounded-2xl bg-violet-50/60 p-5 ring-1 ring-violet-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="reviews-summary-title" className="font-semibold">
          Ce qu’en pensent les clients
        </h3>
        <AiBadge source={summary.source} label="Résumé IA" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-700">{summary.summary}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {summary.pros.length > 0 && (
          <ul aria-label="Points forts" className="space-y-1 text-sm">
            {summary.pros.map((point) => (
              <li key={point} className="flex items-start gap-2 text-emerald-800">
                <ThumbsUp aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        )}
        {summary.cons.length > 0 && (
          <ul aria-label="Points faibles" className="space-y-1 text-sm">
            {summary.cons.map((point) => (
              <li key={point} className="flex items-start gap-2 text-amber-800">
                <ThumbsDown aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Synthèse automatique de {summary.count} avis vérifiés (clients ayant reçu le produit).
      </p>
    </section>
  );
}
