import { useState } from 'react';
import { cn } from '@/shared/utils/cn';

const COVER_GRADIENTS = [
  'from-brand-600 to-brand-900',
  'from-emerald-600 to-teal-900',
  'from-amber-500 to-orange-800',
  'from-rose-500 to-pink-900',
  'from-sky-500 to-indigo-900',
  'from-slate-600 to-slate-900',
];

function hashText(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Image d'un produit. Sans photo (livres) ou si elle ne se charge pas,
 * une couverture est générée à partir du nom du produit.
 *
 * @example <ProductImage src={product.imageUrl} name={product.name} className="aspect-square" />
 */
export function ProductImage({
  src,
  name = '',
  alt = '',
  className,
  fit = 'cover',
  compact = false,
}) {
  const [failedSrc, setFailedSrc] = useState(null);
  const hasImage = Boolean(src) && failedSrc !== src;

  if (hasImage) {
    return (
      <div className={cn('overflow-hidden bg-slate-100', className)}>
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className={cn('size-full', fit === 'contain' ? 'object-contain p-2' : 'object-cover')}
        />
      </div>
    );
  }

  // « Le Petit Prince — Antoine de Saint-Exupéry » → titre + auteur
  const [title, author] = name.split(' — ');
  const gradient = COVER_GRADIENTS[hashText(name) % COVER_GRADIENTS.length];
  return (
    <div
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      className={cn(
        'flex flex-col justify-between overflow-hidden bg-linear-to-br text-white',
        compact ? 'p-1.5' : 'p-4',
        gradient,
        className,
      )}
    >
      {compact ? (
        <span aria-hidden="true" className="m-auto text-lg font-bold">
          {title.charAt(0)}
        </span>
      ) : (
        <>
          <span aria-hidden="true" className="h-1 w-10 rounded-full bg-white/40" />
          <span
            aria-hidden="true"
            className="font-serif text-lg leading-tight font-semibold text-balance"
          >
            {title}
          </span>
          <span aria-hidden="true" className="text-xs tracking-wide text-white/80 uppercase">
            {author ?? 'SmartE-Commerce'}
          </span>
        </>
      )}
    </div>
  );
}
