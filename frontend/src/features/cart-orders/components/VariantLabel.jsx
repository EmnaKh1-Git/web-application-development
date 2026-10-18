/** « Taille M · Couleur Noir » sous le nom d'un article (rien si le produit n'a pas de variante). */
export function VariantLabel({ size, color }) {
  if (!size && !color) return null;
  return (
    <p className="mt-0.5 text-sm text-slate-600">
      {[size && `Taille ${size}`, color && `Couleur ${color}`].filter(Boolean).join(' · ')}
    </p>
  );
}
