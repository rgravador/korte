import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbUpdatePlan, dbDeletePlan } from '@/lib/db-subscription';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { UpdatePlanSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const body = await req.json();
    const parsed = validateBody(UpdatePlanSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const plan = await dbUpdatePlan(sb, planId, parsed.data);
    if (!plan) return serverError('Failed to update plan');
    return ok(plan);
  } catch (err) {
    console.error('[api] PATCH /admin/plans/[planId] error:', err);
    return serverError();
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params;
    const sb = getServerSupabase();
    const success = await dbDeletePlan(sb, planId);
    if (!success) return serverError('Failed to deactivate plan');
    return ok({ planId, deactivated: true });
  } catch (err) {
    console.error('[api] DELETE /admin/plans/[planId] error:', err);
    return serverError();
  }
}
