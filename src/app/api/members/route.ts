import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddMember, dbUpdateMember } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateMemberSchema, UpdateMemberSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateMemberSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const member = await dbAddMember(sb, { tenantId: session.tenantId, ...parsed.data });
    if (!member) return serverError('Failed to create member');
    return created(member);
  } catch (err) {
    console.error('[api] POST /members error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(UpdateMemberSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { memberId, ...updates } = parsed.data;
    const sb = getServerSupabase();
    const success = await dbUpdateMember(sb, memberId, session.tenantId, updates);
    if (!success) return serverError('Failed to update member');
    return ok({ memberId });
  } catch (err) {
    console.error('[api] PATCH /members error:', err);
    return serverError();
  }
}
