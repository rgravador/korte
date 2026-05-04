import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbHydrateTenant } from '@/lib/db';
import { ok, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);

    // system_admin can view any tenant via query param
    const tenantId = session.role === 'system_admin'
      ? (req.nextUrl.searchParams.get('tenantId') ?? session.tenantId)
      : session.tenantId;

    const sb = getServerSupabase();
    const data = await dbHydrateTenant(sb, tenantId);
    if (!data) return serverError('Failed to load tenant data. Check server logs.');

    return ok(data);
  } catch (err) {
    console.error('[api] GET /hydrate error:', err);
    return serverError();
  }
}
