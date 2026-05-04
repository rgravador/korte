import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbGetSports, dbAddSport, dbUpdateSport, dbRemoveSport } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateSportSchema, UpdateSportSchema, DeleteSportSchema, validateBody } from '@/lib/validation';
import { enforceResourceLimit } from '@/lib/subscription';
import { PlanTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const sb = getServerSupabase();
    const sports = await dbGetSports(sb, session.tenantId);
    return ok(sports);
  } catch (err) {
    console.error('[api] GET /sports error:', err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateSportSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const planTier = (req.headers.get('x-plan-tier') as PlanTier) || null;
    const limitResponse = await enforceResourceLimit(sb, session.tenantId, planTier, 'sports');
    if (limitResponse) return limitResponse;

    const sport = await dbAddSport(sb, { tenantId: session.tenantId, ...parsed.data });
    if (!sport) return serverError('Failed to create sport');
    return created(sport);
  } catch (err) {
    console.error('[api] POST /sports error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(UpdateSportSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { sportId, ...updates } = parsed.data;
    const sb = getServerSupabase();
    const success = await dbUpdateSport(sb, sportId, session.tenantId, updates);
    if (!success) return serverError('Failed to update sport');
    return ok({ updated: true });
  } catch (err) {
    console.error('[api] PATCH /sports error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(DeleteSportSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const success = await dbRemoveSport(sb, parsed.data.sportId, session.tenantId);
    if (!success) return badRequest('Cannot remove sport with assigned courts. Reassign or remove courts first.');
    return ok({ deleted: true });
  } catch (err) {
    console.error('[api] DELETE /sports error:', err);
    return serverError();
  }
}
