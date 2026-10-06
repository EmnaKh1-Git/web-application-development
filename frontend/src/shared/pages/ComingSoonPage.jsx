import { CircleCheck, Construction } from 'lucide-react';

/**
 * Page provisoire d'un module pas encore développé.
 * Chaque responsable de module la remplace par ses vraies pages.
 */
export function ComingSoonPage({ title, owner, features = [] }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
        <Construction aria-hidden="true" className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-slate-600">
        Module en cours de développement
        {owner && (
          <>
            {' '}
            · responsable : <strong className="text-slate-900">{owner}</strong>
          </>
        )}
      </p>
      {features.length > 0 && (
        <ul className="mt-6 space-y-2 text-sm text-slate-700">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-400" />
              {feature}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
