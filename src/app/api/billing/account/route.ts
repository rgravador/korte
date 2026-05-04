import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ok, forbidden, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { isAdminRole } from '@/lib/types';
import { getTrialStatus, formatPlanPrice, getPlanLimits } from '@/lib/subscription';
import { dbGetPlans } from '@/lib/db-subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);

    // Only tenant admins can access billing
    if (!isAdminRole(session.role)) {
      return forbidden('Only tenant admins can access billing information.');
    }

    const sb = getServerSupabase();
    const { data: tenant, error } = await sb
      .from('tenants')
      .select('subscription_status, plan_tier, trial_ends_at, current_period_end, name')
      .eq('id', session.tenantId)
      .single();

    if (error || !tenant) {
      console.error('[api] GET /billing/account tenant lookup failed:', error?.message);
      return serverError('Failed to load billing information.');
    }

    const trialStatus = getTrialStatus(tenant.trial_ends_at);

    // Fetch plans from DB instead of hardcoded constants
    const plans = await dbGetPlans(sb);
    const planOptions = plans
      .filter((p) => !p.isContactOnly)
      .map((p) => ({
        tier: p.slug,
        name: p.name,
        price: p.basePrice,
        priceLabel: formatPlanPrice(p),
        perExtraCourt: p.perExtraCourt || undefined,
        includedCourts: p.includedCourts || undefined,
        limits: getPlanLimits(p),
      }));

    return ok({
      tenantName: tenant.name,
      subscriptionStatus: tenant.subscription_status,
      planTier: tenant.plan_tier,
      trialEndsAt: tenant.trial_ends_at,
      currentPeriodEnd: tenant.current_period_end,
      trialStatus,
      planOptions,
    });
  } catch (err) {
    console.error('[api] GET /billing/account error:', err);
    return serverError();
  }
}
