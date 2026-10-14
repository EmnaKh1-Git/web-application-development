import { RotateCcw } from 'lucide-react';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';

/**
 * Erreur de chargement d'une requête, avec un bouton « Réessayer ».
 * @example if (query.isError) return <QueryError error={query.error} onRetry={query.refetch} />;
 */
export function QueryError({ error, onRetry, title = 'Chargement impossible' }) {
  return (
    <Alert variant="error" title={title}>
      <p>{error?.message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => onRetry()}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Réessayer
        </Button>
      )}
    </Alert>
  );
}
