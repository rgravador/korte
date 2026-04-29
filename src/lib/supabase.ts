import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton client — reuses the same connection across all calls
let _client: SupabaseClient | null = null;

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  return { url, key };
}

/**
 * Returns a singleton Supabase client if env vars are configured, otherwise null.
 * When null, the app runs in offline/mock-only mode.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const { url, key } = getEnv();
  if (!url || !key) return null;

  _client = createClient(url, key);
  return _client;
}

/**
 * Check if Supabase is configured — evaluated lazily, not at module load.
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = getEnv();
  return Boolean(url && key);
}
