import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateUser } from '@/lib/db';
import { created, badRequest, serverError } from '@/lib/api-response';

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
