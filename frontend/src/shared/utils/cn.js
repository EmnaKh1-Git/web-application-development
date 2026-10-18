/**
 * Assemble des classes CSS en ignorant les valeurs vides.
 * @example cn('px-4', isActive && 'bg-brand-600', className)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
