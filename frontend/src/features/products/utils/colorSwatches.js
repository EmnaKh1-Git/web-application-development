// Pastille de couleur affichée à côté du nom d'un coloris (gris neutre si le nom est inconnu).
const SWATCHES = {
  noir: '#111827',
  blanc: '#ffffff',
  rouge: '#dc2626',
  bleu: '#2563eb',
  vert: '#16a34a',
  jaune: '#facc15',
  rose: '#f472b6',
  violet: '#8b5cf6',
  or: '#d4af37',
  argent: '#c0c4cc',
  graphite: '#41424c',
  'gris sidéral': '#4b4f54',
  'bleu ciel': '#7dd3fc',
  'bleu alpin': '#5b7c99',
  'bleu marine': '#1e3a8a',
  'bleu perle': '#93c5fd',
  'blanc perle': '#f8fafc',
  'noir prisme': '#0f172a',
  'blanc prisme': '#f1f5f9',
  'vert prisme': '#6ee7b7',
  'lumière stellaire': '#f3ece0',
  'bois naturel': '#b08155',
  terracotta: '#c2410c',
  écaille: '#7c4a1e',
  doré: '#d4af37',
};

export function colorSwatch(colorName) {
  return SWATCHES[colorName?.toLowerCase()] ?? '#94a3b8';
}
