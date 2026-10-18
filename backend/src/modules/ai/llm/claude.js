import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../../config/env.js';

/*
 * Accès à Claude via le SDK officiel d'Anthropic.
 * La clé reste côté serveur (backend/.env) : le Front-End n'appelle jamais Claude directement.
 * Jamais utilisé pendant les tests automatisés (repli local systématique).
 *
 * - Réponses JSON garanties par les « structured outputs » (output_config.format).
 * - Effort explicite : « low » suffit pour ces tâches courtes (résumés, brouillons, extraction).
 * - Si Claude décline une demande (stop_reason « refusal »), l'API la relance d'elle-même sur le
 *   modèle de repli recommandé (fallbacks « default ») ; un refus final déclenche le repli local.
 */

// Modèles qui acceptent le repli automatique côté serveur
const SERVER_FALLBACK_MODELS = [
  'claude-opus-5-5',
  'claude-opus-5',
  'claude-fable-5-1',
  'claude-sonnet-5-5',
];
const SERVER_FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export class AiProviderError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'AiProviderError';
  }
}

/** Claude est utilisé si une clé est configurée et que le mode local n'est pas forcé. */
export function isClaudeEnabled() {
  return env.AI_PROVIDER !== 'local' && Boolean(env.ANTHROPIC_API_KEY) && !env.isTest;
}

let client;
function getClient() {
  client ??= new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: env.AI_TIMEOUT_MS,
    maxRetries: 1,
  });
  return client;
}

/**
 * Appel à l'API Messages.
 * @param {{ system?: string, messages: object[], tools?: object[], effort?: string, format?: object, maxTokens?: number }} request
 */
export async function createMessage({
  system,
  messages,
  tools,
  effort = 'low',
  format,
  maxTokens = 16000,
}) {
  const serverFallback = SERVER_FALLBACK_MODELS.includes(env.AI_MODEL);
  let response;
  try {
    response = await getClient().beta.messages.create({
      model: env.AI_MODEL,
      max_tokens: maxTokens,
      ...(system && { system }),
      messages,
      ...(tools && { tools }),
      output_config: { effort, ...(format && { format }) },
      ...(serverFallback && { betas: [SERVER_FALLBACK_BETA], fallbacks: 'default' }),
    });
  } catch (error) {
    const reason = error instanceof Anthropic.APIError ? `statut ${error.status}` : error.message;
    throw new AiProviderError(`Claude est indisponible (${reason})`, { cause: error });
  }
  if (response.stop_reason === 'refusal') {
    throw new AiProviderError('Claude a décliné la demande');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new AiProviderError('Réponse de Claude incomplète (limite de longueur atteinte)');
  }
  return response;
}

/** Texte de la réponse (concaténation des blocs « text »). */
export function responseText(response) {
  return (response.content ?? [])
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/**
 * Réponse JSON conforme à un schéma (structured outputs).
 * Le schéma doit indiquer `additionalProperties: false` sur chaque objet.
 *
 * @example
 * const { summary } = await generateStructured({
 *   system: 'Tu résumes des avis clients.',
 *   content: 'Avis : ...',
 *   schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
 * });
 */
export async function generateStructured({ system, content, schema, effort, maxTokens }) {
  const response = await createMessage({
    system,
    messages: [{ role: 'user', content }],
    format: { type: 'json_schema', schema },
    effort,
    maxTokens,
  });
  try {
    return JSON.parse(responseText(response));
  } catch (error) {
    throw new AiProviderError('Réponse JSON invalide de Claude', { cause: error });
  }
}
