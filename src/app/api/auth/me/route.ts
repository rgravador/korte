import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbGetUserById } from '@/lib/db';
import { ok, unauthorized, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    if (!session.userId) return unauthorized('No session');

    const sb = getServerSupabase();
    const user = await dbGetUserById(sb, session.userId);
    if (!user) return unauthorized('User not found');

    return ok(user);
  } catch (err) {
    console.error('[api] GET /auth/me error:', err);
    return serverError();
  }
}
