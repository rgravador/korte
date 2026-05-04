import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateUser } from '@/lib/db';
import { ok, created, badRequest, forbidden, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateUserSchema, validateBody } from '@/lib/validation';
import { enforceResourceLimit, resolvePlan } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const username = req.nextUrl.searchParams.get('username');
    if (!username || username.length > 100) return badRequest('Valid username is required');

    const sb = getServerSupabase();
    const { data, error } = await sb
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[api] GET /users check-username error:', error.message);
      return serverError();
    }

    return ok({ available: !data });
  } catch (err) {
    console.error('[api] GET /users error:', err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateUserSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { role } = parsed.data;

    // Role-based creation rules
    if (session.role === 'tenant_staff') {
      return forbidden('Staff cannot create users');
    }
    if (session.role === 'tenant_admin' && role !== 'tenant_staff') {
      return forbidden('Tenant admins can only create staff accounts');
    }

    const sb = getServerSupabase();
    const planSlug = req.headers.get('x-plan-tier') || null;
    const plan = await resolvePlan(sb, planSlug);
    if (!plan) return serverError('Unable to resolve plan limits');

    const resourceType = role === 'tenant_admin' ? 'admins' : 'staff';
    const limitResponse = await enforceResourceLimit(sb, session.tenantId, plan, resourceType);
    if (limitResponse) return limitResponse;

    const user = await dbCreateUser(sb, session.tenantId, parsed.data);
    if (!user) return serverError('Failed to create user');
    return created(user);
  } catch (err) {
    console.error('[api] POST /users error:', err);
    return serverError();
  }
}
