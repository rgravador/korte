import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbGetSports, dbAddSport, dbUpdateSport, dbRemoveSport } from '@/lib/db';
import { ok, created, badRequest, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get('tenantId');
    if (!tenantId) return badRequest('tenantId required');

    const sb = getServerSupabase();
    const sports = await dbGetSports(sb, tenantId);
    return ok(sports);
  } catch (err) {
    console.error('[api] GET /sports error:', err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId, name, operatingHoursRanges } = await req.json();
    if (!tenantId || !name) return badRequest('tenantId and name required');

    const sb = getServerSupabase();
    const sport = await dbAddSport(sb, { tenantId, name, operatingHoursRanges: operatingHoursRanges ?? [] });
    if (!sport) return serverError('Failed to create sport');
    return created(sport);
  } catch (err) {
    console.error('[api] POST /sports error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { sportId, ...updates } = await req.json();
    if (!sportId) return badRequest('sportId required');

    const sb = getServerSupabase();
    const success = await dbUpdateSport(sb, sportId, updates);
    if (!success) return serverError('Failed to update sport');
    return ok({ updated: true });
  } catch (err) {
    console.error('[api] PATCH /sports error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { sportId } = await req.json();
    if (!sportId) return badRequest('sportId required');

    const sb = getServerSupabase();
    const success = await dbRemoveSport(sb, sportId);
    if (!success) return badRequest('Cannot remove sport with assigned courts. Reassign or remove courts first.');
    return ok({ deleted: true });
  } catch (err) {
    console.error('[api] DELETE /sports error:', err);
    return serverError();
  }
}
