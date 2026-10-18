/**
 * Calculs monétaires faits en centimes (entiers) pour éviter les erreurs d'arrondi
 * des nombres à virgule (ex. 0.1 + 0.2 = 0.30000000000000004).
 */
export const toCents = (amount) => Math.round(Number(amount) * 100);
export const fromCents = (cents) => cents / 100;

/** Prix unitaire × quantité. */
export function multiplyAmount(unitPrice, quantity) {
  return fromCents(toCents(unitPrice) * quantity);
}

/** Somme d'une liste de montants. */
export function sumAmounts(amounts) {
  return fromCents(amounts.reduce((total, amount) => total + toCents(amount), 0));
}
