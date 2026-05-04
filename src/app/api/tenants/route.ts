import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbUpdateTenant } from '@/lib/db';
import { ok, badRequest, forbidden, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { UpdateTenantSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);

    // Only tenant_admin or system_admin can update tenant settings
    if (session.role === 'tenant_staff') return forbidden('Only admins can update tenant settings');

    const body = await req.json();
    const parsed = validateBody(UpdateTenantSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const success = await dbUpdateTenant(sb, session.tenantId, parsed.data);
    if (!success) return serverError('Failed to update tenant');
    return ok({ tenantId: session.tenantId });
  } catch (err) {
    console.error('[api] PATCH /tenants error:', err);
    return serverError();
  }
}
