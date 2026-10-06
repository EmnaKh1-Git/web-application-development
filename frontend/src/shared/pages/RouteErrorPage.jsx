import { TriangleAlert } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { NotFoundPage } from './NotFoundPage';
import { StatusPage } from './StatusPage';

/** Affichée par React Router quand une page plante (erreur JavaScript inattendue). */
export function RouteErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }

  if (import.meta.env.DEV) {
    console.error(error);
  }

  return (
    <StatusPage
      icon={TriangleAlert}
      title="Une erreur est survenue"
      message="Rechargez la page. Si le problème persiste, contactez l’équipe."
    />
  );
}
