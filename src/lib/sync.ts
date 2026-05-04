/**
 * Offline-first sync engine.
 *
 * Strategy:
 * - Zustand + localStorage is always the source of truth for the UI (instant, works offline)
 * - When online + Supabase configured: mutations are queued and flushed to Supabase
 * - On app load (online): hydrate store from Supabase, then apply any pending queue
 * - On app load (offline): use localStorage cache as-is
 * - Conflict resolution: last-write-wins (queue replays in order)
 */

import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  dbLogin, dbCreateUser, dbCreateTenant, dbUpdateTenant,
  dbAddCourt, dbUpdateCourt, dbRemoveCourt,
  dbAddItem, dbUpdateItem, dbRemoveItem,
  dbAddMember, dbUpdateMember,
  dbCreateBooking, dbUpdateBookingStatus, dbRescheduleBooking,
  dbHydrateTenant,
  TenantData,
} from './db';
import { BookingStatus, ItemType, UserRole, MemberTier } from './types';

// ── Online detection ─────────────────────────────────────────

export function getOnlineStatus(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function onOnlineChange(cb: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleOnline = () => cb(true);
  const handleOffline = () => cb(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ── Mutation queue ───────────────────────────────────────────

export type MutationType =
  | { kind: 'createBooking'; payload: Record<string, unknown> }
  | { kind: 'updateBookingStatus'; payload: { bookingId: string; tenantId: string; status: BookingStatus } }
  | { kind: 'rescheduleBooking'; payload: { bookingId: string; tenantId: string; date: string; startHour: number } }
  | { kind: 'addMember'; payload: { tenantId: string; firstName: string; lastName: string; phone: string; email: string; tier: MemberTier } }
  | { kind: 'updateMember'; payload: { memberId: string; tenantId: string; updates: Record<string, unknown> } }
  | { kind: 'addCourt'; payload: { tenantId: string; sportId: string; name: string; hourlyRate: number } }
  | { kind: 'updateCourt'; payload: { courtId: string; tenantId: string; updates: Record<string, unknown> } }
  | { kind: 'removeCourt'; payload: { courtId: string; tenantId: string } }
  | { kind: 'addItem'; payload: { tenantId: string; sportId?: string; name: string; price: number; type: ItemType } }
  | { kind: 'updateItem'; payload: { itemId: string; tenantId: string; updates: Record<string, unknown> } }
  | { kind: 'removeItem'; payload: { itemId: string; tenantId: string } }
  | { kind: 'updateTenant'; payload: { tenantId: string; updates: Record<string, unknown> } }
  | { kind: 'createUser'; payload: { tenantId: string; username: string; password: string; role: UserRole; displayName: string; email: string } };

const QUEUE_KEY = 'court-books-sync-queue';

export function getQueue(): MutationType[] {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function enqueue(mutation: MutationType) {
  const queue = getQueue();
  queue.push(mutation);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function clearQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

// ── Flush queue to Supabase ──────────────────────────────────

export async function flushQueue(): Promise<{ flushed: number; failed: number }> {
  const sb = getSupabase();
  if (!sb || !getOnlineStatus()) return { flushed: 0, failed: 0 };

  const queue = getQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  let flushed = 0;
  let failed = 0;

  for (const mutation of queue) {
    try {
      const ok = await executeMutation(sb, mutation);
      if (ok) flushed++;
      else failed++;
    } catch {
      failed++;
    }
  }

  // Clear queue regardless — failed items would conflict on retry
  clearQueue();
  return { flushed, failed };
}

async function executeMutation(sb: ReturnType<typeof getSupabase>, mutation: MutationType): Promise<boolean> {
  if (!sb) return false;

  // RLS disabled for prototype — no tenant context needed

  switch (mutation.kind) {
    case 'createBooking': {
      const result = await dbCreateBooking(sb, mutation.payload as never);
      return result !== null;
    }
    case 'updateBookingStatus': {
      const { bookingId, tenantId, status } = mutation.payload;
      return dbUpdateBookingStatus(sb, bookingId, tenantId, status);
    }
    case 'rescheduleBooking': {
      const { bookingId, tenantId, date, startHour } = mutation.payload;
      return dbRescheduleBooking(sb, bookingId, tenantId, date, startHour);
    }
    case 'addMember': {
      const p = mutation.payload;
      const result = await dbAddMember(sb, p);
      return result !== null;
    }
    case 'updateMember': {
      const { memberId, tenantId, updates } = mutation.payload;
      return dbUpdateMember(sb, memberId, tenantId, updates as never);
    }
    case 'addCourt': {
      const result = await dbAddCourt(sb, mutation.payload);
      return result !== null;
    }
    case 'updateCourt': {
      const { courtId, tenantId, updates } = mutation.payload;
      return dbUpdateCourt(sb, courtId, tenantId, updates as never);
    }
    case 'removeCourt':
      return dbRemoveCourt(sb, mutation.payload.courtId, mutation.payload.tenantId);
    case 'addItem': {
      const result = await dbAddItem(sb, mutation.payload);
      return result !== null;
    }
    case 'updateItem': {
      const { itemId, tenantId, updates } = mutation.payload;
      return dbUpdateItem(sb, itemId, tenantId, updates as never);
    }
    case 'removeItem':
      return dbRemoveItem(sb, mutation.payload.itemId, mutation.payload.tenantId);
    case 'updateTenant': {
      const { tenantId, updates } = mutation.payload;
      return dbUpdateTenant(sb, tenantId, updates as never);
    }
    case 'createUser': {
      const result = await dbCreateUser(sb, mutation.payload.tenantId, {
        username: mutation.payload.username,
        password: mutation.payload.password,
        role: mutation.payload.role,
        displayName: mutation.payload.displayName,
        email: mutation.payload.email,
      });
      return result !== null;
    }
    default:
      return false;
  }
}

// ── Hydration ────────────────────────────────────────────────

export async function hydrateFromSupabase(tenantId: string): Promise<TenantData | null> {
  if (!isSupabaseConfigured() || !getOnlineStatus()) return null;
  const sb = getSupabase();
  if (!sb) return null;

  try {
    return await dbHydrateTenant(sb, tenantId);
  } catch {
    return null;
  }
}

// ── Auth (online) ────────────────────────────────────────────

export async function loginOnline(username: string, password: string) {
  if (!isSupabaseConfigured() || !getOnlineStatus()) return null;
  const sb = getSupabase();
  if (!sb) return null;
  return dbLogin(sb, username, password);
}

export async function setupTenantOnline(data: {
  name: string;
  subdomain: string;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  ownerName: string;
  ownerEmail: string;
  ownerUsername: string;
  ownerPassword: string;
  courts: { name: string; hourlyRate: number }[];
  items: { name: string; price: number; type: ItemType; sportId?: string }[];
}) {
  const configured = isSupabaseConfigured();
  const online = getOnlineStatus();
  console.log('[sync] setupTenantOnline: configured=%s, online=%s', configured, online);

  if (!configured || !online) {
    console.warn('[sync] setupTenantOnline skipped: configured=%s, online=%s', configured, online);
    return null;
  }

  const sb = getSupabase();
  if (!sb) {
    console.error('[sync] setupTenantOnline: getSupabase() returned null');
    return null;
  }

  // 1. Create tenant
  console.log('[sync] Creating tenant:', data.name, data.subdomain);
  const tenant = await dbCreateTenant(sb, {
    name: data.name,
    subdomain: data.subdomain,
    operatingHoursStart: data.operatingHoursStart,
    operatingHoursEnd: data.operatingHoursEnd,
  });
  if (!tenant) {
    console.error('[sync] setupTenantOnline: tenant creation failed');
    return null;
  }
  console.log('[sync] Tenant created:', tenant.id);

  // 2. Create admin user
  console.log('[sync] Creating admin user:', data.ownerUsername);
  const user = await dbCreateUser(sb, tenant.id, {
    username: data.ownerUsername,
    password: data.ownerPassword,
    role: 'tenant_admin',
    displayName: data.ownerName,
    email: data.ownerEmail,
  });
  if (!user) {
    console.error('[sync] setupTenantOnline: admin user creation failed (tenant was created)');
  } else {
    console.log('[sync] Admin user created:', user.id);
  }

  // 3. Create courts
  for (const c of data.courts) {
    const court = await dbAddCourt(sb, { tenantId: tenant.id, sportId: '', name: c.name, hourlyRate: c.hourlyRate });
    if (!court) console.error('[sync] Failed to create court:', c.name);
  }

  // 4. Create items
  for (const item of data.items) {
    const created = await dbAddItem(sb, { tenantId: tenant.id, sportId: item.sportId, ...item });
    if (!created) console.error('[sync] Failed to create item:', item.name);
  }

  console.log('[sync] setupTenantOnline complete for tenant:', tenant.id);
  return { tenant, user };
}

// ── Check if Supabase is available ───────────────────────────

export { isSupabaseConfigured };
