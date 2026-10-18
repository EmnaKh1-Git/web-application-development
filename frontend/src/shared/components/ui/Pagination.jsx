import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/shared/utils/format';
import { Button } from './Button';

/**
 * Navigation entre les pages d'une liste paginée par l'API.
 * @example <Pagination meta={meta} onPageChange={(page) => setFilters({ page })} />
 */
export function Pagination({ meta, onPageChange, itemLabel = 'résultat(s)' }) {
  if (!meta || meta.total === 0) return null;
  const { page, totalPages, total } = meta;

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
    >
      <p>
        {formatNumber(total)} {itemLabel} · page {page} sur {Math.max(totalPages, 1)}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Précédent
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Suivant
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        </div>
      )}
    </nav>
  );
}
