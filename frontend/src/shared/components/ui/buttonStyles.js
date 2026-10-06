import { cn } from '@/shared/utils/cn';

const VARIANTS = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:outline-brand-600',
  secondary:
    'bg-white text-slate-800 shadow-sm ring-1 ring-slate-300 ring-inset hover:bg-slate-50 focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600',
  ghost: 'text-slate-700 hover:bg-slate-100 focus-visible:outline-brand-600',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-3 text-base',
};

/**
 * Classes d'un bouton : utilisables aussi sur un lien.
 * @example <Link to="/products" className={buttonClassName({ variant: 'secondary' })}>Catalogue</Link>
 */
export function buttonClassName({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
} = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors',
    'focus-visible:outline-2 focus-visible:outline-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTS[variant],
    SIZES[size],
    fullWidth && 'w-full',
    className,
  );
}
