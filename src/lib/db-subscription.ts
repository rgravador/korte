/**
 * Subscription-specific DB queries.
 * Separated from db.ts to keep file sizes manageable.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionStatus, Plan } from './types';

// ── Plan row mapper ────────────────────────────────────────────

function toPlan(r: Record<string, unknown>): Plan {
  return {
    id: r.id as string,
    name: r.name as string,
    slug: r.slug as string,
    description: (r.description as string) ?? null,
    basePrice: r.base_price as number,
    perExtraCourt: (r.per_extra_court as number) ?? 0,
    includedCourts: (r.included_courts as number) ?? 0,
    maxSports: (r.max_sports as number) ?? 1,
    maxCourts: (r.max_courts as number) ?? 5,
    maxAdmins: (r.max_admins as number) ?? 1,
    maxStaff: (r.max_staff as number) ?? 3,
    isActive: r.is_active as boolean,
    isContactOnly: (r.is_contact_only as boolean) ?? false,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
  };
}

// ── Plan CRUD ──────────────────────────────────────────────────

/** Get all active plans sorted by sort_order. */
export async function dbGetPlans(sb: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await sb
    .from('plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('[db-subscription] dbGetPlans FAILED:', error.message);
    return [];
  }
  return (data ?? []).map(toPlan);
}

/** Get ALL plans (including inactive) for admin. */
export async function dbGetAllPlans(sb: SupabaseClient): Promise<Plan[]> {
  const { data, error } = await sb
    .from('plans')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('[db-subscription] dbGetAllPlans FAILED:', error.message);
    return [];
  }
  return (data ?? []).map(toPlan);
}

/** Get a single plan by slug. */
export async function dbGetPlanBySlug(sb: SupabaseClient, slug: string): Promise<Plan | null> {
  const { data, error } = await sb
    .from('plans')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) {
    console.error('[db-subscription] dbGetPlanBySlug FAILED:', error.message);
    return null;
  }
  return data ? toPlan(data) : null;
}

/** Create a new plan. */
export async function dbCreatePlan(
  sb: SupabaseClient,
  data: {
    name: string;
    slug: string;
    description?: string | null;
    basePrice: number;
    perExtraCourt?: number;
    includedCourts?: number;
    maxSports?: number;
    maxCourts?: number;
    maxAdmins?: number;
    maxStaff?: number;
    isActive?: boolean;
    isContactOnly?: boolean;
    sortOrder?: number;
  },
): Promise<Plan | null> {
  const row: Record<string, unknown> = {
    name: data.name,
    slug: data.slug,
    base_price: data.basePrice,
  };
  if (data.description !== undefined) row.description = data.description;
  if (data.perExtraCourt !== undefined) row.per_extra_court = data.perExtraCourt;
  if (data.includedCourts !== undefined) row.included_courts = data.includedCourts;
  if (data.maxSports !== undefined) row.max_sports = data.maxSports;
  if (data.maxCourts !== undefined) row.max_courts = data.maxCourts;
  if (data.maxAdmins !== undefined) row.max_admins = data.maxAdmins;
  if (data.maxStaff !== undefined) row.max_staff = data.maxStaff;
  if (data.isActive !== undefined) row.is_active = data.isActive;
  if (data.isContactOnly !== undefined) row.is_contact_only = data.isContactOnly;
  if (data.sortOrder !== undefined) row.sort_order = data.sortOrder;

  const { data: created, error } = await sb.from('plans').insert(row).select().single();
  if (error || !created) {
    console.error('[db-subscription] dbCreatePlan FAILED:', error?.message);
    return null;
  }
  return toPlan(created);
}

/** Update a plan. */
export async function dbUpdatePlan(
  sb: SupabaseClient,
  id: string,
  data: Partial<{
    name: string;
    slug: string;
    description: string | null;
    basePrice: number;
    perExtraCourt: number;
    includedCourts: number;
    maxSports: number;
    maxCourts: number;
    maxAdmins: number;
    maxStaff: number;
    isActive: boolean;
    isContactOnly: boolean;
    sortOrder: number;
  }>,
): Promise<Plan | null> {
  const mapped: Record<string, unknown> = {};
  if (data.name !== undefined) mapped.name = data.name;
  if (data.slug !== undefined) mapped.slug = data.slug;
  if (data.description !== undefined) mapped.description = data.description;
  if (data.basePrice !== undefined) mapped.base_price = data.basePrice;
  if (data.perExtraCourt !== undefined) mapped.per_extra_court = data.perExtraCourt;
  if (data.includedCourts !== undefined) mapped.included_courts = data.includedCourts;
  if (data.maxSports !== undefined) mapped.max_sports = data.maxSports;
  if (data.maxCourts !== undefined) mapped.max_courts = data.maxCourts;
  if (data.maxAdmins !== undefined) mapped.max_admins = data.maxAdmins;
  if (data.maxStaff !== undefined) mapped.max_staff = data.maxStaff;
  if (data.isActive !== undefined) mapped.is_active = data.isActive;
  if (data.isContactOnly !== undefined) mapped.is_contact_only = data.isContactOnly;
  if (data.sortOrder !== undefined) mapped.sort_order = data.sortOrder;

  const { data: updated, error } = await sb.from('plans').update(mapped).eq('id', id).select().single();
  if (error || !updated) {
    console.error('[db-subscription] dbUpdatePlan FAILED:', error?.message);
    return null;
  }
  return toPlan(updated);
}

/** Delete a plan (soft delete by deactivating). */
export async function dbDeletePlan(sb: SupabaseClient, id: string): Promise<boolean> {
  const { error } = await sb.from('plans').update({ is_active: false }).eq('id', id);
  if (error) {
    console.error('[db-subscription] dbDeletePlan FAILED:', error.message);
    return false;
  }
  return true;
}

// ── Tenant subscription queries ────────────────────────────────

export interface TenantSubscriptionStatus {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  planTier: string | null;
  adminOverride: boolean;
}

export interface TenantNeedingAttention {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: SubscriptionStatus;
  planTier: string | null;
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
      planTier: (row.plan_tier as string) ?? null,
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
    planTier: (data.plan_tier as string) ?? null,
    adminOverride: (data.admin_override as boolean) ?? false,
  };
}
