import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton client — reuses the same connection across all calls
let _client: SupabaseClient | null = null;

function getEnv() {
  const url = process.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return { url, anonKey, serviceRoleKey };
}

/**
 * Returns a singleton Supabase client.
 * Uses service_role key if available (dev mode — bypasses RLS).
 * Falls back to anon key.
 * Returns null if no keys are configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const { url, anonKey, serviceRoleKey } = getEnv();
  if (!url) return null;

  // Prefer service_role in dev (bypasses RLS)
  const key = serviceRoleKey || anonKey;
  if (!key) return null;

  console.debug('[supabase] init client:', serviceRoleKey ? 'service_role' : 'anon');

  _client = createClient(url, key);
  return _client;
}

/**
 * Check if Supabase is configured — evaluated lazily, not at module load.
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey, serviceRoleKey } = getEnv();
  return Boolean(url && (anonKey || serviceRoleKey));
}
