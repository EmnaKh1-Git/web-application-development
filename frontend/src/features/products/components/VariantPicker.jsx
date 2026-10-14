import { useId } from 'react';
import { cn } from '@/shared/utils/cn';
import { colorSwatch } from '../utils/colorSwatches';

/**
 * Choix d'une variante (taille ou couleur) sous forme de boutons radio.
 * @example <VariantPicker label="Taille" options={product.sizes} value={size} onChange={setSize} />
 */
export function VariantPicker({ label, options, value, onChange, kind = 'size' }) {
  const name = useId();
  if (!options?.length) return null;

  return (
    <fieldset>
      <legend className="text-sm font-semibold text-slate-900">
        {label}
        {value && <span className="ml-1 font-normal text-slate-600">: {value}</span>}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option === value;
          return (
            <label
              key={option}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium ring-1 transition ring-inset',
                'has-focus-visible:ring-2 has-focus-visible:ring-brand-600',
                isSelected
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-slate-700 ring-slate-300 hover:ring-slate-400',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option}
                checked={isSelected}
                onChange={() => onChange(option)}
                className="sr-only"
              />
              {kind === 'color' && (
                <span
                  aria-hidden="true"
                  className="size-4 rounded-full ring-1 ring-slate-300"
                  style={{ backgroundColor: colorSwatch(option) }}
                />
              )}
              {option}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
