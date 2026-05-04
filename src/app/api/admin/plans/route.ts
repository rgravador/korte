import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbGetAllPlans, dbCreatePlan } from '@/lib/db-subscription';
import { ok, created, badRequest, serverError } from '@/lib/api-response';
import { CreatePlanSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServerSupabase();
    const plans = await dbGetAllPlans(sb);
    return ok(plans);
  } catch (err) {
    console.error('[api] GET /admin/plans error:', err);
    return serverError();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateBody(CreatePlanSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const plan = await dbCreatePlan(sb, parsed.data);
    if (!plan) return serverError('Failed to create plan');
    return created(plan);
  } catch (err) {
    console.error('[api] POST /admin/plans error:', err);
    return serverError();
  }
}
