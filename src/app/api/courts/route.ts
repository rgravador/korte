import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddCourt, dbUpdateCourt, dbRemoveCourt } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();
    const court = await dbAddCourt(sb, body);
    if (!court) return serverError('Failed to create court');
    return created(court);
  } catch (err) {
    console.error('[api] POST /courts error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { courtId, ...updates } = await req.json();
    if (!courtId) return badRequest('courtId required');

    const sb = getServerSupabase();
    const success = await dbUpdateCourt(sb, courtId, updates);
    if (!success) return serverError('Failed to update court');
    return ok({ courtId });
  } catch (err) {
    console.error('[api] PATCH /courts error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { courtId } = await req.json();
    if (!courtId) return badRequest('courtId required');

    const sb = getServerSupabase();
    const success = await dbRemoveCourt(sb, courtId);
    if (!success) return serverError('Failed to delete court');
    return ok({ courtId });
  } catch (err) {
    console.error('[api] DELETE /courts error:', err);
    return serverError();
  }
}
