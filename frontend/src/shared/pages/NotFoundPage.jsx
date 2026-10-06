import { Compass } from 'lucide-react';
import { StatusPage } from './StatusPage';

export function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      icon={Compass}
      title="Page introuvable"
      message="La page demandée n’existe pas ou a été déplacée."
    />
  );
}
