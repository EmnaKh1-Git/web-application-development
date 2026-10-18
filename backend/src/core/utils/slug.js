import { Op } from 'sequelize';

/** « Écouteurs sans fil Beats » → « ecouteurs-sans-fil-beats » */
export function slugify(text) {
  const slug = text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // retire les accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  return slug || 'element';
}

/** Slug unique pour un modèle Sequelize (ajoute -2, -3... si le slug existe déjà). */
export async function uniqueSlug(Model, text, { excludeId, transaction } = {}) {
  const base = slugify(text);
  let slug = base;
  for (let suffix = 2; ; suffix += 1) {
    const where = { slug, ...(excludeId && { id: { [Op.ne]: excludeId } }) };
    if ((await Model.count({ where, transaction })) === 0) return slug;
    slug = `${base}-${suffix}`;
  }
}
