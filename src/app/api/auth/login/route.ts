import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbLogin } from '@/lib/db';
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) return badRequest('Username and password required');

    const sb = getServerSupabase();
    const user = await dbLogin(sb, username, password);
    if (!user) return unauthorized('Invalid username or password');

    return ok(user);
  } catch (err) {
    console.error('[api] POST /auth/login error:', err);
    return serverError();
  }
}
