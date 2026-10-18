import { ValidationError } from '../errors/index.js';

const SOURCES = ['params', 'query', 'body'];

/**
 * Valide la requête avec des schémas Zod AVANT d'appeler le contrôleur.
 * - Données valides   : remplacées par la version « nettoyée » (types convertis,
 *                       champs inconnus retirés, valeurs par défaut appliquées).
 * - Données invalides : erreur 400 VALIDATION_ERROR avec le détail par champ.
 *
 * @example
 * router.post('/products', authenticate, requirePermission(PERMISSIONS.PRODUCTS_MANAGE),
 *   validate({ body: createProductSchema }), productsController.create);
 *
 * @param {{ params?: import('zod').ZodType, query?: import('zod').ZodType, body?: import('zod').ZodType }} schemas
 */
export function validate(schemas) {
  return (req, _res, next) => {
    const details = [];

    for (const source of SOURCES) {
      const schema = schemas[source];
      if (!schema) continue;

      const result = schema.safeParse(req[source] ?? {});
      if (result.success) {
        setRequestValue(req, source, result.data);
      } else {
        details.push(...formatZodIssues(result.error.issues, source));
      }
    }

    if (details.length > 0) {
      return next(new ValidationError(details));
    }
    return next();
  };
}

/** Transforme les erreurs Zod en liste { field, location, message }. */
export function formatZodIssues(issues, location) {
  return issues.map((issue) => ({
    field: issue.path.join('.'),
    ...(location && { location }),
    message: issue.message,
  }));
}

function setRequestValue(req, source, value) {
  if (source === 'query') {
    // Express 5 : req.query est en lecture seule, on le redéfinit sur la requête.
    Object.defineProperty(req, 'query', {
      value,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return;
  }
  req[source] = value;
}
