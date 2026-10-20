import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from '@smart-ecommerce/shared';

/**
 * Configuration de l'application, lue depuis les variables d'environnement.
 *
 * 1. Le fichier backend/.env est chargé s'il existe (jamais versionné dans Git).
 *    Les variables déjà définies (ex. en CI) restent prioritaires.
 * 2. Les variables sont validées : l'API refuse de démarrer si la configuration
 *    est incomplète ou invalide, avec un message explicite.
 *
 * Règle : aucun secret dans le code. On importe toujours `env` depuis ce fichier,
 * jamais `process.env` directement.
 */
const envFilePath = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

const optionalString = z.string().optional();

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    // Port de l'API. API_PORT est propre au projet : une variable PORT fixée par un autre
    // outil (IDE, lanceur de commandes...) ne le remplace pas. PORT reste lu en secours,
    // car certains hébergeurs l'imposent.
    API_PORT: z.coerce.number().int().positive().optional(),
    PORT: z.coerce.number().int().positive().optional(),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),

    DB_HOST: z.string().default('localhost'),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_NAME: z.string({ error: 'DB_NAME est obligatoire' }),
    DB_NAME_TEST: optionalString,
    DB_USER: z.string({ error: 'DB_USER est obligatoire' }),
    DB_PASSWORD: z.string().default(''),
    DB_LOGGING: z.stringbool().default(false),
    // Compte administrateur MySQL : uniquement pour Docker et « npm run db:create »
    DB_ROOT_USER: z.string().default('root'),
    DB_ROOT_PASSWORD: z.string().default(''),

    JWT_SECRET: z
      .string({ error: 'JWT_SECRET est obligatoire (lancez « npm run setup:env »)' })
      .min(32, 'JWT_SECRET doit contenir au moins 32 caractères'),
    JWT_EXPIRES_IN: z
      .string()
      .regex(/^\d+[smhd]$/, 'JWT_EXPIRES_IN doit être une durée comme 15m, 1h ou 7d')
      .default('1h'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),

    // Module IA. Sans clé, toutes les fonctions d'IA marchent avec les algorithmes locaux ;
    // avec une clé Anthropic, Claude les enrichit (lecture de photos, assistant, rédaction).
    // AI_PROVIDER=local force le mode local même si une clé est présente.
    AI_PROVIDER: z.enum(['auto', 'local']).default('auto'),
    ANTHROPIC_API_KEY: optionalString,
    AI_MODEL: z.string().default('claude-opus-5-5'),
    AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120_000).default(30_000),
    AI_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),

    SUPABASE_URL: optionalString,
    SUPABASE_PUBLISHABLE_KEY: optionalString,
    SUPABASE_SECRET_KEY: optionalString,
    SUPABASE_JWKS_URL: optionalString,

    // Comptes de démonstration créés par « npm run db:seed » (facultatifs)
    SEED_ADMIN_EMAIL: optionalString,
    SEED_ADMIN_PASSWORD: optionalString,
    SEED_STOCK_MANAGER_EMAIL: optionalString,
    SEED_STOCK_MANAGER_PASSWORD: optionalString,
    SEED_CLIENT_EMAIL: optionalString,
    SEED_CLIENT_PASSWORD: optionalString,
  })
  .refine((env) => env.NODE_ENV !== 'production' || env.BCRYPT_SALT_ROUNDS >= 10, {
    path: ['BCRYPT_SALT_ROUNDS'],
    message: 'En production, BCRYPT_SALT_ROUNDS doit être au moins 10',
  })
  .refine(
    (env) => env.NODE_ENV !== 'test' || (env.DB_NAME_TEST && env.DB_NAME_TEST !== env.DB_NAME),
    {
      path: ['DB_NAME_TEST'],
      message:
        'En mode test, DB_NAME_TEST est obligatoire et doit être différent de DB_NAME (les tests vident la base)',
    },
  )
  .refine(
    (env) =>
      ![env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, env.SUPABASE_SECRET_KEY].some(Boolean) ||
      [env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, env.SUPABASE_SECRET_KEY].every(Boolean),
    {
      path: ['SUPABASE_URL'],
      message:
        'SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY et SUPABASE_SECRET_KEY doivent être fournis ensemble',
    },
  );

// Une variable vide (« KEY= ») est considérée comme absente.
const rawEnv = Object.fromEntries(
  Object.entries(process.env).map(([key, value]) => [key, value === '' ? undefined : value]),
);

const result = envSchema.safeParse(rawEnv);
if (!result.success) {
  const problems = result.error.issues.map(
    (issue) => `  - ${issue.path.join('.')} : ${issue.message}`,
  );
  throw new Error(`Configuration invalide (backend/.env) :\n${problems.join('\n')}`);
}

const config = result.data;

export const env = Object.freeze({
  ...config,
  PORT: config.API_PORT ?? config.PORT ?? 4000,
  LOG_LEVEL: config.LOG_LEVEL ?? (config.NODE_ENV === 'test' ? 'warn' : 'info'),
  isProduction: config.NODE_ENV === 'production',
  isDevelopment: config.NODE_ENV === 'development',
  isTest: config.NODE_ENV === 'test',
  /** Base utilisée : base de test pendant les tests, base normale sinon. */
  databaseName: config.NODE_ENV === 'test' ? config.DB_NAME_TEST : config.DB_NAME,
  /** Origines autorisées par CORS (CORS_ORIGIN accepte une liste séparée par des virgules). */
  corsOrigins: config.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  supabase: {
    enabled: Boolean(config.SUPABASE_URL && config.SUPABASE_SECRET_KEY),
    url: config.SUPABASE_URL,
    publishableKey: config.SUPABASE_PUBLISHABLE_KEY,
    secretKey: config.SUPABASE_SECRET_KEY,
    jwksUrl: config.SUPABASE_JWKS_URL,
  },
});
