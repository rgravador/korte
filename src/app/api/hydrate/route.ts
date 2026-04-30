import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbHydrateTenant } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId');
    if (!tenantId) return badRequest('tenantId required');

    const sb = getServerSupabase();
    const data = await dbHydrateTenant(sb, tenantId);
    if (!data) return badRequest('Tenant not found');

    return ok(data);
  } catch (err) {
    console.error('[api] GET /hydrate error:', err);
    return serverError();
  }
}
