/** Cadre commun aux pages de connexion et d'inscription. */
export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="mx-auto w-full max-w-md py-6 sm:py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
        {children}
      </div>
    </div>
  );
}
