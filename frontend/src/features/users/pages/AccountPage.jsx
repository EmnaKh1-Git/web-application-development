import { useAuth } from '@/shared/auth/useAuth';
import { Alert } from '@/shared/components/ui/Alert';
import { RoleBadge } from '@/shared/components/ui/RoleBadge';

/** Espace « Mon compte » (Sprint 0 : consultation uniquement). */
export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Mon compte</h1>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">Nom</dt>
            <dd className="font-medium">
              {user.firstName} {user.lastName}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Email</dt>
            <dd className="font-medium break-all">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Rôle</dt>
            <dd className="mt-1">
              <RoleBadge role={user.role} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">Permissions</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {user.permissions.map((permission) => (
                <code key={permission} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                  {permission}
                </code>
              ))}
            </dd>
          </div>
        </dl>
      </section>

      <Alert variant="info" title="Bientôt disponible">
        Modification du profil, changement de mot de passe, adresses et historique (Sprint 1 —
        Fares).
      </Alert>
    </div>
  );
}
