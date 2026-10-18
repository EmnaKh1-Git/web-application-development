import { cn } from '@/shared/utils/cn';

/** Classes communes aux champs (input, select, textarea), avec ou sans erreur. */
export function fieldClassName({ error, className } = {}) {
  return cn(
    'block w-full rounded-lg bg-white px-3 py-2 text-slate-900 shadow-xs ring-1 ring-inset',
    'placeholder:text-slate-400 focus:ring-2 focus:outline-none focus:ring-inset sm:text-sm',
    'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500',
    error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600',
    className,
  );
}
