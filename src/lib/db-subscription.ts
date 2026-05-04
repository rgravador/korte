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

export interface TenantNeedingAttention {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: SubscriptionStatus;
  planTier: PlanTier | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  adminOverride: boolean;
  attentionReason: 'trial_expiring' | 'trial_expired' | 'overdue' | 'admin_override';
}

export async function dbGetTenantsNeedingAttention(
  sb: SupabaseClient
): Promise<TenantNeedingAttention[]> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const nowISO = now.toISOString();
  const threeDaysISO = threeDaysFromNow.toISOString();

  const { data, error } = await sb
    .from('tenants')
    .select('id, name, subdomain, subscription_status, plan_tier, trial_ends_at, current_period_end, admin_override')
    .neq('subdomain', 'system');

  if (error) {
    console.error('[db-subscription] dbGetTenantsNeedingAttention FAILED:', error.message, error.details);
    return [];
  }

  const results: TenantNeedingAttention[] = [];

  for (const row of data ?? []) {
    const status = (row.subscription_status as SubscriptionStatus) ?? 'trial';
    const trialEndsAt = row.trial_ends_at as string | null;
    const currentPeriodEnd = row.current_period_end as string | null;
    const adminOverride = (row.admin_override as boolean) ?? false;

    const base = {
      id: row.id as string,
      name: row.name as string,
      subdomain: row.subdomain as string,
      subscriptionStatus: status,
      planTier: (row.plan_tier as PlanTier) ?? null,
      trialEndsAt,
      currentPeriodEnd,
      adminOverride,
    };

    if (adminOverride) {
      results.push({ ...base, attentionReason: 'admin_override' });
    }

    if (status === 'trial' && trialEndsAt) {
      if (trialEndsAt < nowISO) {
        results.push({ ...base, attentionReason: 'trial_expired' });
      } else if (trialEndsAt <= threeDaysISO) {
        results.push({ ...base, attentionReason: 'trial_expiring' });
      }
    }

    if (status === 'active' && currentPeriodEnd && currentPeriodEnd < nowISO) {
      results.push({ ...base, attentionReason: 'overdue' });
    }
  }

  return results;
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
