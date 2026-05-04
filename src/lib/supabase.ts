import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client using the anon key.
 * This module is safe to import from client components.
 * For server-side operations, use supabase-server.ts instead.
 */
export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !anonKey) return null;

  _client = createClient(url, anonKey);
  return _client;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  return Boolean(url && anonKey);
}
