import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbUpdateTenant } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId, ...updates } = await req.json();
    if (!tenantId) return badRequest('tenantId required');

    const sb = getServerSupabase();
    const success = await dbUpdateTenant(sb, tenantId, updates);
    if (!success) return serverError('Failed to update tenant');
    return ok({ tenantId });
  } catch (err) {
    console.error('[api] PATCH /tenants error:', err);
    return serverError();
  }
}
