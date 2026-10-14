import { Minus, Plus } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

/**
 * Choix d'une quantité avec boutons − / +, bornée entre `min` et `max`.
 * @example <QuantityStepper value={quantity} max={stock} onChange={setQuantity} label="Quantité" />
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled = false,
  label,
  size = 'md',
}) {
  const canDecrease = !disabled && value > min;
  const canIncrease = !disabled && (max === undefined || value < max);
  const buttonClass = cn(
    'inline-flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40',
    size === 'sm' ? 'size-8' : 'size-10',
  );

  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center overflow-hidden rounded-lg bg-white ring-1 ring-slate-300 ring-inset"
    >
      <button
        type="button"
        className={buttonClass}
        disabled={!canDecrease}
        onClick={() => onChange(value - 1)}
      >
        <Minus aria-hidden="true" className="size-4" />
        <span className="sr-only">Diminuer</span>
      </button>
      <output
        aria-live="polite"
        className={cn('text-center font-semibold', size === 'sm' ? 'w-8 text-sm' : 'w-10')}
      >
        {value}
      </output>
      <button
        type="button"
        className={buttonClass}
        disabled={!canIncrease}
        onClick={() => onChange(value + 1)}
      >
        <Plus aria-hidden="true" className="size-4" />
        <span className="sr-only">Augmenter</span>
      </button>
    </div>
  );
}
