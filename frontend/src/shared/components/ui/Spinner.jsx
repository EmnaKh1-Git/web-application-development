import { cn } from '@/shared/utils/cn';

const SIZES = { sm: 'size-4 border-2', md: 'size-6 border-2', lg: 'size-10 border-3' };

/** Indicateur de chargement. */
export function Spinner({ size = 'md', className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block animate-spin rounded-full border-current border-r-transparent',
        SIZES[size],
        className,
      )}
    />
  );
}

/** Chargement d'une page entière. */
export function PageSpinner({ label = 'Chargement…' }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center text-brand-600">
      <Spinner size="lg" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
