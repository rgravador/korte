/**
 * Subscription helpers — plan limit enforcement, trial status, freeze checks.
 * Plan data is now stored in the database; these helpers operate on Plan objects.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { Plan } from './types';
import { planLimitExceeded } from './api-response';
import { dbGetPlanBySlug } from './db-subscription';

// ── Plan limits ─────────────────────────────────────────────

interface PlanLimits {
  sports: number;
  courts: number;
  admins: number;
  staff: number;
}

/** Extracts PlanLimits from a Plan object. maxCourts=0 means unlimited (Infinity). */
export function getPlanLimits(plan: Plan): PlanLimits {
  return {
    sports: plan.maxSports === 0 ? Infinity : plan.maxSports,
    courts: plan.maxCourts === 0 ? Infinity : plan.maxCourts,
    admins: plan.maxAdmins === 0 ? Infinity : plan.maxAdmins,
    staff: plan.maxStaff === 0 ? Infinity : plan.maxStaff,
  };
}

/** Format plan price for display. */
export function formatPlanPrice(plan: Plan): string {
  if (plan.isContactOnly) {
    return 'Contact us';
  }
  if (plan.perExtraCourt > 0) {
    return `₱${plan.basePrice}/mo + ₱${plan.perExtraCourt}/extra court`;
  }
  return `₱${plan.basePrice}/mo`;
}

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

/**
 * Resolves a Plan from the database by slug.
 * Falls back to 'pro' plan when slug is null (trial tenants).
 */
export async function resolvePlan(sb: SupabaseClient, planSlug: string | null): Promise<Plan | null> {
  const slug = planSlug ?? 'pro';
  return dbGetPlanBySlug(sb, slug);
}

/**
 * Enforces a resource limit for a tenant. Queries the DB for the current count,
 * checks against plan limits, and returns either null (proceed) or a NextResponse
 * with a PLAN_LIMIT_EXCEEDED error.
 */
export async function enforceResourceLimit(
  sb: SupabaseClient,
  tenantId: string,
  plan: Plan,
  resourceType: ResourceType,
) {
  const table = RESOURCE_TABLE[resourceType];
  const label = RESOURCE_LABEL[resourceType];
  const limits = getPlanLimits(plan);
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
    return planLimitExceeded(
      `You've reached the ${plan.name} plan limit of ${limit} ${label}. Upgrade your plan for higher limits.`,
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
