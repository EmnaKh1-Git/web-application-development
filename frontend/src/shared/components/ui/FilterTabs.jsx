import { cn } from '@/shared/utils/cn';

/**
 * Filtre rapide sous forme d'onglets (un seul choix actif).
 * @example
 * <FilterTabs label="Statut" value={filters.status} onChange={(status) => setFilters({ status })}
 *   options={[{ value: 'all', label: 'Tous', count: 12 }, { value: 'low', label: 'Stock faible' }]} />
 */
export function FilterTabs({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex gap-1 overflow-x-auto pb-1">
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 ring-inset hover:bg-slate-50',
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs',
                  isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-600',
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
