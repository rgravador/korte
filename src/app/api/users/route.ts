import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateUser } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username');
    if (!username) return badRequest('Username is required');

    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[api] GET /users check-username error:', error.message);
      return serverError();
    }

    return ok({ available: !data });
  } catch (err) {
    console.error('[api] GET /users error:', err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, username, password, role, displayName, email } = await req.json();
    if (!tenantId || !username || !password) return badRequest('Missing required fields');

    const sb = getServerSupabase();
    const user = await dbCreateUser(sb, tenantId, { username, password, role, displayName, email });
    if (!user) return serverError('Failed to create user');
    return created(user);
  } catch (err) {
    console.error('[api] POST /users error:', err);
    return serverError();
  }
}
