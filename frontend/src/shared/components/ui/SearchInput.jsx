import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { fieldClassName } from './fieldStyles';

const DEBOUNCE_DELAY = 350;

/**
 * Champ de recherche : `onSearch` n'est appelé qu'une fois la saisie terminée (anti-rebond),
 * pour ne pas envoyer une requête à l'API à chaque frappe.
 *
 * @example <SearchInput label="Rechercher un produit" value={filters.search} onSearch={(search) => setFilters({ search })} />
 */
export function SearchInput({ label, value = '', onSearch, placeholder, className }) {
  const [text, setText] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);
  const timerRef = useRef(null);

  // Valeur modifiée de l'extérieur (ex. « Réinitialiser les filtres ») : le champ suit.
  if (value !== previousValue) {
    setPreviousValue(value);
    if (value !== text.trim()) setText(value);
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const search = (nextText, delay = DEBOUNCE_DELAY) => {
    setText(nextText);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSearch(nextText.trim()), delay);
  };

  return (
    <div className={className}>
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={text}
          onChange={(event) => search(event.target.value)}
          placeholder={placeholder ?? label}
          className={fieldClassName({ className: 'pr-9 pl-9' })}
        />
        {text && (
          <button
            type="button"
            onClick={() => search('', 0)}
            className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Effacer la recherche</span>
          </button>
        )}
      </label>
    </div>
  );
}
