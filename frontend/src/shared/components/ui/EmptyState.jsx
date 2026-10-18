import { Inbox } from 'lucide-react';

/**
 * Liste vide : icône, message et action éventuelle (lien ou bouton).
 * `titleAs="h1"` quand l'état vide occupe toute la page (ex. « Produit introuvable »).
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  titleAs: Title = 'h2',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white px-6 py-12 text-center shadow-sm ring-1 ring-slate-200">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon aria-hidden="true" className="size-6" />
      </span>
      <Title className="mt-4 font-semibold">{title}</Title>
      {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
