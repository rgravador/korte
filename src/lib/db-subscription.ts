/**
 * Subscription-specific DB queries.
 * Separated from db.ts to keep file sizes manageable.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionStatus, PlanTier } from './types';

export interface TenantSubscriptionStatus {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  planTier: PlanTier | null;
  adminOverride: boolean;
}

export async function dbGetTenantSubscriptionStatus(
  sb: SupabaseClient,
  tenantId: string
): Promise<TenantSubscriptionStatus | null> {
  const { data, error } = await sb
    .from('tenants')
    .select('subscription_status, trial_ends_at, current_period_end, plan_tier, admin_override')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('[db-subscription] dbGetTenantSubscriptionStatus FAILED:', error.message, error.details);
    return null;
  }

  if (!data) return null;

  return {
    subscriptionStatus: (data.subscription_status as SubscriptionStatus) ?? 'trial',
    trialEndsAt: (data.trial_ends_at as string) ?? null,
    currentPeriodEnd: (data.current_period_end as string) ?? null,
    planTier: (data.plan_tier as PlanTier) ?? null,
    adminOverride: (data.admin_override as boolean) ?? false,
  };
}
