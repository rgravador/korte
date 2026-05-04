/**
 * Client-side API helper — calls Next.js API routes instead of Supabase directly.
 * The service_role key never leaves the server.
 */

import {
  User, Tenant, Court, Item, Member, Booking, Sport, BookingStatus, ItemType, UserRole, MemberTier, TimeRange,
} from './types';

interface ApiResponse<T> {
  data: T | null;
  error: { code: string; message: string } | null;
}

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    const json: ApiResponse<T> = await res.json();
    if (!res.ok || json.error) {
      console.error(`[api] ${options?.method ?? 'GET'} ${url} failed:`, json.error?.message ?? res.statusText);
      return null;
    }
    console.debug(`[api] ${options?.method ?? 'GET'} ${url} OK`);
    return json.data;
  } catch (err) {
    console.error(`[api] ${options?.method ?? 'GET'} ${url} error:`, err);
    return null;
  }
}

// ── Auth ─────────────────────────────────────────────────────

export async function apiLogin(username: string, password: string): Promise<User | null> {
  return fetchApi<User>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function apiRegister(data: {
  name: string;
  subdomain: string;
  operatingHoursStart: number;
  operatingHoursEnd: number;
  ownerName: string;
  ownerEmail: string;
  ownerUsername: string;
  ownerPassword: string;
  courts: { name: string; hourlyRate: number }[];
  items: { name: string; price: number; type: ItemType }[];
  sports?: { name: string; operatingHoursRanges: TimeRange[]; courts: { name: string; hourlyRate: number }[] }[];
}): Promise<{ tenant: Tenant; user: User; courts: Court[]; items: Item[] } | null> {
  return fetchApi('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Hydrate ──────────────────────────────────────────────────

export interface TenantData {
  tenant: Tenant;
  users: User[];
  sports: Sport[];
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];
}

export async function apiHydrate(tenantId: string): Promise<TenantData | null> {
  return fetchApi<TenantData>(`/api/hydrate?tenantId=${encodeURIComponent(tenantId)}`);
}

// ── Bookings ─────────────────────────────────────────────────

export async function apiCreateBooking(booking: Omit<Booking, 'id' | 'createdAt'>): Promise<Booking | null> {
  return fetchApi<Booking>('/api/bookings', {
    method: 'POST',
    body: JSON.stringify(booking),
  });
}

export async function apiUpdateBookingStatus(bookingId: string, status: BookingStatus): Promise<boolean> {
  const result = await fetchApi('/api/bookings', {
    method: 'PATCH',
    body: JSON.stringify({ bookingId, status }),
  });
  return result !== null;
}

export async function apiRescheduleBooking(bookingId: string, date: string, startHour: number): Promise<boolean> {
  const result = await fetchApi('/api/bookings', {
    method: 'PATCH',
    body: JSON.stringify({ bookingId, date, startHour }),
  });
  return result !== null;
}

// ── Members ──────────────────────────────────────────────────

export async function apiAddMember(data: {
  tenantId: string; firstName: string; lastName: string; phone: string; email: string; tier: MemberTier;
}): Promise<Member | null> {
  return fetchApi<Member>('/api/members', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateMember(memberId: string, updates: Partial<Member>): Promise<boolean> {
  const result = await fetchApi('/api/members', {
    method: 'PATCH',
    body: JSON.stringify({ memberId, ...updates }),
  });
  return result !== null;
}

// ── Sports ──────────────────────────────────────────────────

export async function apiAddSport(data: { tenantId: string; name: string; operatingHoursRanges: TimeRange[] }): Promise<Sport | null> {
  return fetchApi<Sport>('/api/sports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateSport(sportId: string, updates: Partial<{ name: string; operatingHoursRanges: TimeRange[]; isActive: boolean }>): Promise<boolean> {
  const result = await fetchApi('/api/sports', {
    method: 'PATCH',
    body: JSON.stringify({ sportId, ...updates }),
  });
  return result !== null;
}

export async function apiRemoveSport(sportId: string): Promise<boolean> {
  const result = await fetchApi('/api/sports', {
    method: 'DELETE',
    body: JSON.stringify({ sportId }),
  });
  return result !== null;
}

// ── Courts ───────────────────────────────────────────────────

export async function apiAddCourt(data: { tenantId: string; sportId: string; name: string; hourlyRate: number }): Promise<Court | null> {
  return fetchApi<Court>('/api/courts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateCourt(courtId: string, updates: Partial<Court>): Promise<boolean> {
  const result = await fetchApi('/api/courts', {
    method: 'PATCH',
    body: JSON.stringify({ courtId, ...updates }),
  });
  return result !== null;
}

export async function apiRemoveCourt(courtId: string): Promise<boolean> {
  const result = await fetchApi('/api/courts', {
    method: 'DELETE',
    body: JSON.stringify({ courtId }),
  });
  return result !== null;
}

// ── Items ────────────────────────────────────────────────────

export async function apiAddItem(data: { tenantId: string; name: string; price: number; type: ItemType }): Promise<Item | null> {
  return fetchApi<Item>('/api/items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiUpdateItem(itemId: string, updates: Partial<Item>): Promise<boolean> {
  const result = await fetchApi('/api/items', {
    method: 'PATCH',
    body: JSON.stringify({ itemId, ...updates }),
  });
  return result !== null;
}

export async function apiRemoveItem(itemId: string): Promise<boolean> {
  const result = await fetchApi('/api/items', {
    method: 'DELETE',
    body: JSON.stringify({ itemId }),
  });
  return result !== null;
}

// ── Tenant ───────────────────────────────────────────────────

export async function apiUpdateTenant(tenantId: string, updates: Partial<Tenant>): Promise<boolean> {
  const result = await fetchApi('/api/tenants', {
    method: 'PATCH',
    body: JSON.stringify({ tenantId, ...updates }),
  });
  return result !== null;
}

// ── Users ────────────────────────────────────────────────────

export async function apiCheckUsername(username: string): Promise<boolean> {
  const result = await fetchApi<{ available: boolean }>(`/api/users?username=${encodeURIComponent(username)}`);
  return result?.available ?? false;
}

export async function apiCreateUser(data: {
  tenantId: string; username: string; password: string; role: UserRole; displayName: string; email: string;
}): Promise<User | null> {
  return fetchApi<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
