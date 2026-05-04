import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ok, forbidden, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { PLAN_PRICING, PLAN_LIMITS, getTrialStatus } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);

    // Only tenant admins can access billing
    if (session.role !== 'tenant_admin') {
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

    return ok({
      tenantName: tenant.name,
      subscriptionStatus: tenant.subscription_status,
      planTier: tenant.plan_tier,
      trialEndsAt: tenant.trial_ends_at,
      currentPeriodEnd: tenant.current_period_end,
      trialStatus,
      planOptions: [
        {
          tier: 'basic',
          name: 'Basic',
          price: PLAN_PRICING.basic,
          limits: PLAN_LIMITS.basic,
        },
        {
          tier: 'pro',
          name: 'Pro',
          price: PLAN_PRICING.pro,
          limits: PLAN_LIMITS.pro,
        },
      ],
    });
  } catch (err) {
    console.error('[api] GET /billing/account error:', err);
    return serverError();
  }
}
