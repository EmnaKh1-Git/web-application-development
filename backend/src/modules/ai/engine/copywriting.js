/*
 * Rédaction locale d'une description de produit (repli quand Claude n'est pas configuré) :
 * un gabarit par rayon, complété par les caractéristiques connues (tailles, couleurs, prix).
 */

const PITCHES = {
  'high-tech': {
    hook: 'Profitez de la technologie au quotidien',
    benefits: 'des performances fiables, une prise en main intuitive et un design soigné',
  },
  maison: {
    hook: 'Apportez une touche de caractère à votre intérieur',
    benefits:
      'des matériaux de qualité, une utilisation pratique et un style qui s’accorde à toutes les pièces',
  },
  sport: {
    hook: 'Donnez le meilleur de vous-même',
    benefits:
      'une conception robuste, un excellent confort d’utilisation et une durabilité pensée pour l’entraînement',
  },
  mode: {
    hook: 'Affirmez votre style',
    benefits: 'des finitions soignées, un confort au quotidien et une allure facile à associer',
  },
  beaute: {
    hook: 'Prenez soin de vous',
    benefits:
      'une formule agréable, une tenue remarquable et un plaisir d’utilisation au quotidien',
  },
  livres: {
    hook: 'Plongez dans une lecture marquante',
    benefits: 'une œuvre de référence, une édition de qualité et un plaisir de lecture garanti',
  },
};

const DEFAULT_PITCH = {
  hook: 'Découvrez un produit sélectionné pour vous',
  benefits: 'une qualité contrôlée, un excellent rapport qualité-prix et une livraison offerte',
};

export function productDescriptionTemplate({ name, categorySlug, sizes = [], colors = [] }) {
  const pitch = PITCHES[categorySlug] ?? DEFAULT_PITCH;
  const sentences = [`${pitch.hook} avec ${name} : ${pitch.benefits}.`];
  const options = [];
  if (sizes.length > 0) options.push(`en tailles ${sizes.join(', ')}`);
  if (colors.length > 0) options.push(`en coloris ${colors.join(', ')}`);
  if (options.length > 0) sentences.push(`Disponible ${options.join(' et ')}.`);
  sentences.push(
    'Livraison offerte et annulation gratuite tant que la commande n’est pas expédiée.',
  );
  return sentences.join(' ');
}
