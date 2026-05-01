import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddMember, dbUpdateMember } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();
    const member = await dbAddMember(sb, body);
    if (!member) return serverError('Failed to create member');
    return created(member);
  } catch (err) {
    console.error('[api] POST /members error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { memberId, ...updates } = await req.json();
    if (!memberId) return badRequest('memberId required');

    const sb = getServerSupabase();
    const success = await dbUpdateMember(sb, memberId, updates);
    if (!success) return serverError('Failed to update member');
    return ok({ memberId });
  } catch (err) {
    console.error('[api] PATCH /members error:', err);
    return serverError();
  }
}
