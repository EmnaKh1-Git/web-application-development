import { ShieldAlert } from 'lucide-react';
import { StatusPage } from './StatusPage';

export function ForbiddenPage() {
  return (
    <StatusPage
      code="403"
      icon={ShieldAlert}
      title="Accès refusé"
      message="Votre compte n’a pas les droits nécessaires pour accéder à cette page."
    />
  );
}
