import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddCourt, dbUpdateCourt, dbRemoveCourt } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateCourtSchema, UpdateCourtSchema, DeleteCourtSchema, validateBody } from '@/lib/validation';
import { enforceResourceLimit } from '@/lib/subscription';
import { PlanTier } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateCourtSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const planTier = (req.headers.get('x-plan-tier') as PlanTier) || null;
    const limitResponse = await enforceResourceLimit(sb, session.tenantId, planTier, 'courts');
    if (limitResponse) return limitResponse;

    const court = await dbAddCourt(sb, { tenantId: session.tenantId, ...parsed.data });
    if (!court) return serverError('Failed to create court');
    return created(court);
  } catch (err) {
    console.error('[api] POST /courts error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(UpdateCourtSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { courtId, ...updates } = parsed.data;
    const sb = getServerSupabase();
    const success = await dbUpdateCourt(sb, courtId, session.tenantId, updates);
    if (!success) return serverError('Failed to update court');
    return ok({ courtId });
  } catch (err) {
    console.error('[api] PATCH /courts error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(DeleteCourtSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const success = await dbRemoveCourt(sb, parsed.data.courtId, session.tenantId);
    if (!success) return serverError('Failed to delete court');
    return ok({ courtId: parsed.data.courtId });
  } catch (err) {
    console.error('[api] DELETE /courts error:', err);
    return serverError();
  }
}
