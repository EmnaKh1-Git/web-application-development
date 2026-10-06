/**
 * Affiche sous chaque champ d'un formulaire react-hook-form les erreurs
 * de validation renvoyées par l'API (code VALIDATION_ERROR).
 * Retourne true si des erreurs de champ ont été appliquées.
 *
 * @example
 * catch (error) {
 *   if (!applyServerValidationErrors(error, setError)) setServerError(error.message);
 * }
 */
export function applyServerValidationErrors(error, setError) {
  if (error?.code !== 'VALIDATION_ERROR' || !error.details?.length) {
    return false;
  }
  for (const { field, message } of error.details) {
    setError(field, { type: 'server', message });
  }
  return true;
}
