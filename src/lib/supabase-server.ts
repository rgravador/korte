import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using service_role key.
 * This bypasses RLS and should ONLY be used in API routes (src/app/api/).
 * NEVER import this file from client components.
 */

let _serverClient: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient {
  if (_serverClient) return _serverClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These are required for API routes.'
    );
  }

  _serverClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _serverClient;
}
