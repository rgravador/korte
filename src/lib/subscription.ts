/**
 * Subscription config — plan limits, pricing, and enforcement helpers.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { PlanTier } from './types';
import { planLimitExceeded } from './api-response';

// ── Plan limits ─────────────────────────────────────────────

interface PlanLimits {
  sports: number;
  courts: number;
  admins: number;
  staff: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  basic: { sports: 1, courts: 5, admins: 1, staff: 3 },
  pro: { sports: 3, courts: 20, admins: 3, staff: 9 },
};

// ── Plan pricing (₱/month) ─────────────────────────────────

export const PLAN_PRICING: Record<PlanTier, number> = {
  basic: 499,
  pro: 999,
};

// ── Resource type to DB table/filter mapping ────────────────

type ResourceType = 'sports' | 'courts' | 'admins' | 'staff';

const RESOURCE_TABLE: Record<ResourceType, string> = {
  sports: 'sports',
  courts: 'courts',
  admins: 'users',
  staff: 'users',
};

const RESOURCE_LABEL: Record<ResourceType, string> = {
  sports: 'sports',
  courts: 'courts',
  admins: 'admin users',
  staff: 'staff users',
};

// ── Helpers ─────────────────────────────────────────────────

/** Returns the plan limits for a tier. Null (trial) uses Pro limits. */
export function getPlanLimits(planTier: PlanTier | null): PlanLimits {
  return PLAN_LIMITS[planTier ?? 'pro'];
}

/** Returns true when the current count already meets or exceeds the plan limit. */
export function isOverPlanLimit(
  planTier: PlanTier | null,
  resourceType: ResourceType,
  currentCount: number,
): boolean {
  const limits = getPlanLimits(planTier);
  return currentCount >= limits[resourceType];
}

/**
 * Enforces a resource limit for a tenant. Queries the DB for the current count,
 * checks against plan limits, and returns either null (proceed) or a NextResponse
 * with a PLAN_LIMIT_EXCEEDED error.
 */
export async function enforceResourceLimit(
  sb: SupabaseClient,
  tenantId: string,
  planTier: PlanTier | null,
  resourceType: ResourceType,
) {
  const table = RESOURCE_TABLE[resourceType];
  const label = RESOURCE_LABEL[resourceType];
  const limits = getPlanLimits(planTier);
  const limit = limits[resourceType];

  // Build count query
  let query = sb.from(table).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId);

  // For admins/staff, filter by role
  if (resourceType === 'admins') {
    query = query.eq('role', 'tenant_admin');
  } else if (resourceType === 'staff') {
    query = query.eq('role', 'tenant_staff');
  }

  const { count, error } = await query;

  if (error) {
    console.error(`[subscription] enforceResourceLimit count query failed for ${resourceType}:`, error.message);
    return planLimitExceeded(`Unable to verify ${label} limit. Please try again.`);
  }

  const currentCount = count ?? 0;

  if (currentCount >= limit) {
    const tierName = planTier ?? 'pro';
    const tierLabel = tierName.charAt(0).toUpperCase() + tierName.slice(1);

    // Pro ceiling — suggest Max tier contact
    if (tierName === 'pro') {
      return planLimitExceeded(
        `You've reached the ${tierLabel} plan limit of ${limit} ${label}. Need more? Contact us for a custom Max plan.`,
      );
    }

    return planLimitExceeded(
      `You've reached the ${tierLabel} plan limit of ${limit} ${label}. Upgrade to Pro for higher limits.`,
    );
  }

  return null;
}

// ── Trial status ────────────────────────────────────────────

const WARNING_THRESHOLD_DAYS = 3;

interface TrialStatus {
  daysRemaining: number;
  isExpired: boolean;
  isWarning: boolean;
}

/** Computes trial status from the trial end date. */
export function getTrialStatus(trialEndsAt: string | null): TrialStatus {
  if (!trialEndsAt) {
    return { daysRemaining: 0, isExpired: true, isWarning: false };
  }

  const now = new Date();
  const endsAt = new Date(trialEndsAt);
  const diffMs = endsAt.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
  const isExpired = diffMs <= 0;
  const isWarning = !isExpired && daysRemaining <= WARNING_THRESHOLD_DAYS;

  return { daysRemaining, isExpired, isWarning };
}

// ── Freeze check ────────────────────────────────────────────

/**
 * Determines whether a tenant should be treated as frozen based on
 * subscription status and date comparisons. Same logic the middleware uses.
 */
export function isTenantFrozen(
  subscriptionStatus: string,
  trialEndsAt: string | null,
  currentPeriodEnd: string | null,
): boolean {
  if (subscriptionStatus === 'frozen') return true;

  const now = new Date();

  if (subscriptionStatus === 'trial') {
    if (!trialEndsAt) return true;
    return new Date(trialEndsAt).getTime() < now.getTime();
  }

  if (subscriptionStatus === 'active') {
    if (!currentPeriodEnd) return false;
    return new Date(currentPeriodEnd).getTime() < now.getTime();
  }

  return false;
}
