import { Link } from 'react-router';
import { cn } from '@/shared/utils/cn';

const TONES = {
  brand: 'bg-brand-50 text-brand-600',
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  danger: 'bg-red-50 text-red-600',
  neutral: 'bg-slate-100 text-slate-600',
};

/**
 * Chiffre clé d'un tableau de bord (cliquable si `to` est fourni).
 * @example <StatCard label="Ruptures" value={3} icon={PackageX} tone="danger" to="/admin/stock?status=out" />
 */
export function StatCard({ label, value, hint, icon: Icon, tone = 'brand', to }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-600">{label}</p>
        {Icon && (
          <span
            className={cn('inline-flex size-9 items-center justify-center rounded-lg', TONES[tone])}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  );
  const className = 'block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200';

  return to ? (
    <Link to={to} className={cn(className, 'transition hover:ring-brand-300')}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
}
