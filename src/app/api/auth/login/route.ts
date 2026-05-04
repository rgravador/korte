import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbLogin } from '@/lib/db';
import { ok, badRequest, unauthorized, serverError } from '@/lib/api-response';
import { signSession, createSessionCookie } from '@/lib/auth';
import { LoginSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateBody(LoginSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { username, password } = parsed.data;
    const sb = getServerSupabase();
    const user = await dbLogin(sb, username, password);
    if (!user) return unauthorized('Invalid username or password');

    const token = await signSession({ userId: user.id, tenantId: user.tenantId, role: user.role });
    const response = ok(user);
    response.headers.set('Set-Cookie', createSessionCookie(token));
    return response;
  } catch (err) {
    console.error('[api] POST /auth/login error:', err);
    return serverError();
  }
}
