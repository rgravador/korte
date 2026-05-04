import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbUpdateTenant } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { AdminUpdateTenantSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServerSupabase();

    const { data: tenants, error } = await sb
      .from('tenants')
      .select('*')
      .neq('subdomain', 'system')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[api] GET /admin/tenants failed:', error.message);
      return serverError('Failed to fetch tenants');
    }

    const tenantIds = (tenants ?? []).map((t) => t.id);

    const { data: userCounts } = await sb
      .from('users')
      .select('tenant_id')
      .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['__none__']);

    const { data: bookingCounts } = await sb
      .from('bookings')
      .select('tenant_id, status')
      .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['__none__']);

    const { data: memberCounts } = await sb
      .from('members')
      .select('tenant_id')
      .in('tenant_id', tenantIds.length > 0 ? tenantIds : ['__none__']);

    const stats: Record<string, { users: number; bookings: number; members: number }> = {};
    for (const id of tenantIds) {
      stats[id] = { users: 0, bookings: 0, members: 0 };
    }
    for (const u of userCounts ?? []) {
      if (stats[u.tenant_id]) stats[u.tenant_id].users++;
    }
    for (const b of bookingCounts ?? []) {
      if (stats[b.tenant_id]) stats[b.tenant_id].bookings++;
    }
    for (const m of memberCounts ?? []) {
      if (stats[m.tenant_id]) stats[m.tenant_id].members++;
    }

    const enriched = (tenants ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      subdomain: t.subdomain,
      courtCount: t.court_count,
      operatingHoursStart: t.operating_hours_start,
      operatingHoursEnd: t.operating_hours_end,
      freeTrialDays: t.free_trial_days ?? 7,
      createdAt: t.created_at,
      stats: stats[t.id] ?? { users: 0, bookings: 0, members: 0 },
    }));

    return ok(enriched);
  } catch (err) {
    console.error('[api] GET /admin/tenants error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateBody(AdminUpdateTenantSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { tenantId, ...updates } = parsed.data;
    const sb = getServerSupabase();
    const success = await dbUpdateTenant(sb, tenantId, updates);
    if (!success) return serverError('Failed to update tenant');
    return ok({ tenantId });
  } catch (err) {
    console.error('[api] PATCH /admin/tenants error:', err);
    return serverError();
  }
}
