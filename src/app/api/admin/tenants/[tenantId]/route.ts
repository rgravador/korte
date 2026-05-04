import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbHydrateTenant } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  try {
    const { tenantId } = await params;
    if (!tenantId) return badRequest('tenantId required');

    const sb = getServerSupabase();
    const data = await dbHydrateTenant(sb, tenantId);
    if (!data) return serverError('Tenant not found');

    return ok(data);
  } catch (err) {
    console.error('[api] GET /admin/tenants/[tenantId] error:', err);
    return serverError();
  }
}
