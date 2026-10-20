import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Client serveur Supabase. La clé secrète ne doit jamais être exposée au frontend.
 * Le client reste désactivé dans les environnements qui n'ont pas de configuration Supabase.
 */
export const supabase = env.supabase.enabled
  ? createClient(env.supabase.url, env.supabase.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;
