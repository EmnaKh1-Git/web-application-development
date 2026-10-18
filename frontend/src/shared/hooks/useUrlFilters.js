import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router';

/**
 * Filtres d'une liste conservés dans l'URL (?search=...&page=2) :
 * le lien est partageable et le bouton « Retour » du navigateur restaure la liste.
 * Les valeurs sont des chaînes ; une valeur égale à sa valeur par défaut n'apparaît pas dans l'URL.
 * Changer un filtre ramène à la page 1.
 *
 * @example
 * const [filters, setFilters] = useUrlFilters({ search: '', status: 'all', page: '1' });
 * setFilters({ status: 'low' });
 */
export function useUrlFilters(defaults) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Les valeurs par défaut sont une constante de la page : on ne dépend que de leur contenu
  const defaultsKey = JSON.stringify(defaults);

  const filters = useMemo(() => {
    const values = JSON.parse(defaultsKey);
    for (const key of Object.keys(values)) {
      const value = searchParams.get(key);
      if (value !== null) values[key] = value;
    }
    return values;
  }, [searchParams, defaultsKey]);

  const setFilters = useCallback(
    (changes) => {
      const defaultValues = JSON.parse(defaultsKey);
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [key, rawValue] of Object.entries(changes)) {
            const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
            if (value === '' || value === defaultValues[key]) next.delete(key);
            else next.set(key, value);
          }
          if (!('page' in changes)) next.delete('page');
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, defaultsKey],
  );

  return [filters, setFilters];
}
