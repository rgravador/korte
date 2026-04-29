/**
 * Data Access Layer — Supabase CRUD operations.
 * Every function returns typed app objects (camelCase).
 * Returns null / empty array on error so callers can fall back to local store.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  User, Tenant, Court, Item, Member,
  Booking, BookingItem, BookingStatus, ItemType, UserRole, MemberTier,
} from './types';

// ── Row ↔ App mappers ────────────────────────────────────────

function toUser(r: Record<string, unknown>): User {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    username: r.username as string,
    password: '', // never send hash to client
    role: r.role as UserRole,
    displayName: r.display_name as string,
    email: (r.email as string) ?? '',
    isActive: r.is_active as boolean,
    createdAt: r.created_at as string,
  };
}

function toTenant(r: Record<string, unknown>): Tenant {
  return {
    id: r.id as string,
    name: r.name as string,
    subdomain: r.subdomain as string,
    courtCount: r.court_count as number,
    operatingHoursStart: r.operating_hours_start as number,
    operatingHoursEnd: r.operating_hours_end as number,
    createdAt: r.created_at as string,
  };
}

function toCourt(r: Record<string, unknown>): Court {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    hourlyRate: Number(r.hourly_rate),
    isActive: r.is_active as boolean,
  };
}

function toItem(r: Record<string, unknown>): Item {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    price: Number(r.price),
    type: r.type as ItemType,
    isActive: r.is_active as boolean,
  };
}

function toMember(r: Record<string, unknown>): Member {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    phone: (r.phone as string) ?? '',
    email: (r.email as string) ?? '',
    tier: r.tier as MemberTier,
    totalBookings: r.total_bookings as number,
    totalNoShows: r.total_no_shows as number,
    lastVisit: r.last_visit as string | null,
    createdAt: r.created_at as string,
  };
}

function toBookingItem(r: Record<string, unknown>): BookingItem {
  return {
    itemId: r.item_id as string,
    itemName: r.item_name as string,
    itemType: r.item_type as ItemType,
    unitPrice: Number(r.unit_price),
    quantity: r.quantity as number,
  };
}

function toBooking(r: Record<string, unknown>, items: BookingItem[]): Booking {
  return {
    id: r.id as string,
    tenantId: r.tenant_id as string,
    courtId: r.court_id as string,
    memberId: (r.member_id as string) ?? null,
    memberName: r.member_name as string,
    date: r.date as string,
    startHour: r.start_hour as number,
    durationMinutes: r.duration_minutes as number,
    status: r.status as BookingStatus,
    courtFee: Number(r.court_fee),
    itemsTotal: Number(r.items_total),
    total: Number(r.total),
    isRecurring: r.is_recurring as boolean,
    notes: (r.notes as string) ?? '',
    items,
    createdAt: r.created_at as string,
  };
}

// ── RLS tenant context ───────────────────────────────────────

/**
 * Sets the tenant context for RLS policies before executing queries.
 * Must be called before any tenant-scoped query.
 */
async function setTenantContext(sb: SupabaseClient, tenantId: string) {
  // Use raw SQL via rpc to SET LOCAL the session variable
  await sb.rpc('set_config', {
    setting: 'app.current_tenant_id',
    value: tenantId,
    is_local: true,
  });
}

/**
 * Wraps a query with tenant context for RLS isolation.
 */
async function withTenant<T>(
  sb: SupabaseClient,
  tenantId: string,
  fn: () => Promise<T>
): Promise<T> {
  await setTenantContext(sb, tenantId);
  return fn();
}

// ── Auth ─────────────────────────────────────────────────────

export async function dbLogin(
  sb: SupabaseClient,
  username: string,
  password: string
): Promise<User | null> {
  // We call the DB function verify_password via rpc
  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;

  // Verify password via rpc
  const { data: valid } = await sb.rpc('verify_password', {
    plain: password,
    hashed: data.password_hash,
  });

  if (!valid) return null;
  return toUser(data);
}

export async function dbCreateUser(
  sb: SupabaseClient,
  tenantId: string,
  data: { username: string; password: string; role: UserRole; displayName: string; email: string }
): Promise<User | null> {
  // Hash password via rpc
  const { data: hash } = await sb.rpc('hash_password', { plain: data.password });
  if (!hash) return null;

  const { data: row, error } = await sb
    .from('users')
    .insert({
      tenant_id: tenantId,
      username: data.username,
      password_hash: hash,
      role: data.role,
      display_name: data.displayName,
      email: data.email,
    })
    .select()
    .single();

  if (error || !row) return null;
  return toUser(row);
}

// ── Tenant ───────────────────────────────────────────────────

export async function dbCreateTenant(
  sb: SupabaseClient,
  data: {
    name: string;
    subdomain: string;
    operatingHoursStart: number;
    operatingHoursEnd: number;
  }
): Promise<Tenant | null> {
  const { data: row, error } = await sb
    .from('tenants')
    .insert({
      name: data.name,
      subdomain: data.subdomain,
      operating_hours_start: data.operatingHoursStart,
      operating_hours_end: data.operatingHoursEnd,
    })
    .select()
    .single();

  if (error || !row) return null;
  return toTenant(row);
}

export async function dbGetTenant(sb: SupabaseClient, tenantId: string): Promise<Tenant | null> {
  const { data, error } = await sb.from('tenants').select('*').eq('id', tenantId).single();
  if (error || !data) return null;
  return toTenant(data);
}

export async function dbUpdateTenant(
  sb: SupabaseClient,
  tenantId: string,
  updates: Partial<{ name: string; operatingHoursStart: number; operatingHoursEnd: number }>
): Promise<boolean> {
  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.operatingHoursStart !== undefined) mapped.operating_hours_start = updates.operatingHoursStart;
  if (updates.operatingHoursEnd !== undefined) mapped.operating_hours_end = updates.operatingHoursEnd;

  const { error } = await sb.from('tenants').update(mapped).eq('id', tenantId);
  return !error;
}

// ── Courts ───────────────────────────────────────────────────

export async function dbGetCourts(sb: SupabaseClient, tenantId: string): Promise<Court[]> {
  const { data, error } = await sb.from('courts').select('*').eq('tenant_id', tenantId).order('created_at');
  if (error || !data) return [];
  return data.map(toCourt);
}

export async function dbAddCourt(
  sb: SupabaseClient,
  court: { tenantId: string; name: string; hourlyRate: number }
): Promise<Court | null> {
  const { data, error } = await sb
    .from('courts')
    .insert({ tenant_id: court.tenantId, name: court.name, hourly_rate: court.hourlyRate })
    .select()
    .single();
  if (error || !data) return null;
  return toCourt(data);
}

export async function dbUpdateCourt(
  sb: SupabaseClient,
  courtId: string,
  updates: Partial<{ name: string; hourlyRate: number; isActive: boolean }>
): Promise<boolean> {
  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.hourlyRate !== undefined) mapped.hourly_rate = updates.hourlyRate;
  if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
  const { error } = await sb.from('courts').update(mapped).eq('id', courtId);
  return !error;
}

export async function dbRemoveCourt(sb: SupabaseClient, courtId: string): Promise<boolean> {
  const { error } = await sb.from('courts').delete().eq('id', courtId);
  return !error;
}

// ── Items ────────────────────────────────────────────────────

export async function dbGetItems(sb: SupabaseClient, tenantId: string): Promise<Item[]> {
  const { data, error } = await sb.from('items').select('*').eq('tenant_id', tenantId).order('created_at');
  if (error || !data) return [];
  return data.map(toItem);
}

export async function dbAddItem(
  sb: SupabaseClient,
  item: { tenantId: string; name: string; price: number; type: ItemType }
): Promise<Item | null> {
  const { data, error } = await sb
    .from('items')
    .insert({ tenant_id: item.tenantId, name: item.name, price: item.price, type: item.type })
    .select()
    .single();
  if (error || !data) return null;
  return toItem(data);
}

export async function dbUpdateItem(
  sb: SupabaseClient,
  itemId: string,
  updates: Partial<{ name: string; price: number; isActive: boolean }>
): Promise<boolean> {
  const mapped: Record<string, unknown> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.price !== undefined) mapped.price = updates.price;
  if (updates.isActive !== undefined) mapped.is_active = updates.isActive;
  const { error } = await sb.from('items').update(mapped).eq('id', itemId);
  return !error;
}

export async function dbRemoveItem(sb: SupabaseClient, itemId: string): Promise<boolean> {
  const { error } = await sb.from('items').delete().eq('id', itemId);
  return !error;
}

// ── Members ──────────────────────────────────────────────────

export async function dbGetMembers(sb: SupabaseClient, tenantId: string): Promise<Member[]> {
  const { data, error } = await sb.from('members').select('*').eq('tenant_id', tenantId).order('created_at');
  if (error || !data) return [];
  return data.map(toMember);
}

export async function dbAddMember(
  sb: SupabaseClient,
  m: { tenantId: string; firstName: string; lastName: string; phone: string; email: string; tier: MemberTier }
): Promise<Member | null> {
  const { data, error } = await sb
    .from('members')
    .insert({
      tenant_id: m.tenantId,
      first_name: m.firstName,
      last_name: m.lastName,
      phone: m.phone,
      email: m.email,
      tier: m.tier,
    })
    .select()
    .single();
  if (error || !data) return null;
  return toMember(data);
}

export async function dbUpdateMember(
  sb: SupabaseClient,
  memberId: string,
  updates: Partial<Member>
): Promise<boolean> {
  const mapped: Record<string, unknown> = {};
  if (updates.firstName !== undefined) mapped.first_name = updates.firstName;
  if (updates.lastName !== undefined) mapped.last_name = updates.lastName;
  if (updates.phone !== undefined) mapped.phone = updates.phone;
  if (updates.email !== undefined) mapped.email = updates.email;
  if (updates.tier !== undefined) mapped.tier = updates.tier;
  if (updates.totalBookings !== undefined) mapped.total_bookings = updates.totalBookings;
  if (updates.totalNoShows !== undefined) mapped.total_no_shows = updates.totalNoShows;
  if (updates.lastVisit !== undefined) mapped.last_visit = updates.lastVisit;
  const { error } = await sb.from('members').update(mapped).eq('id', memberId);
  return !error;
}

// ── Bookings ─────────────────────────────────────────────────

export async function dbGetBookings(sb: SupabaseClient, tenantId: string): Promise<Booking[]> {
  const { data: rows, error } = await sb
    .from('bookings')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })
    .order('start_hour');

  if (error || !rows) return [];

  const bookingIds = rows.map((r) => r.id);
  const { data: itemRows } = await sb
    .from('booking_items')
    .select('*')
    .in('booking_id', bookingIds);

  const itemsByBooking: Record<string, BookingItem[]> = {};
  for (const ir of itemRows ?? []) {
    const bid = ir.booking_id as string;
    if (!itemsByBooking[bid]) itemsByBooking[bid] = [];
    itemsByBooking[bid].push(toBookingItem(ir));
  }

  return rows.map((r) => toBooking(r, itemsByBooking[r.id] ?? []));
}

export async function dbCreateBooking(
  sb: SupabaseClient,
  b: Omit<Booking, 'id' | 'createdAt'>
): Promise<Booking | null> {
  const { data: row, error } = await sb
    .from('bookings')
    .insert({
      tenant_id: b.tenantId,
      court_id: b.courtId,
      member_id: b.memberId,
      member_name: b.memberName,
      date: b.date,
      start_hour: b.startHour,
      duration_minutes: b.durationMinutes,
      status: b.status,
      court_fee: b.courtFee,
      items_total: b.itemsTotal,
      total: b.total,
      is_recurring: b.isRecurring,
      notes: b.notes,
    })
    .select()
    .single();

  if (error || !row) return null;

  // Insert booking items
  if (b.items.length > 0) {
    await sb.from('booking_items').insert(
      b.items.map((item) => ({
        booking_id: row.id,
        item_id: item.itemId,
        item_name: item.itemName,
        item_type: item.itemType,
        unit_price: item.unitPrice,
        quantity: item.quantity,
      }))
    );
  }

  return toBooking(row, b.items);
}

export async function dbUpdateBookingStatus(
  sb: SupabaseClient,
  bookingId: string,
  status: BookingStatus
): Promise<boolean> {
  const { error } = await sb.from('bookings').update({ status }).eq('id', bookingId);
  return !error;
}

export async function dbRescheduleBooking(
  sb: SupabaseClient,
  bookingId: string,
  date: string,
  startHour: number
): Promise<boolean> {
  const { error } = await sb
    .from('bookings')
    .update({ date, start_hour: startHour })
    .eq('id', bookingId);
  return !error;
}

// ── Users (list for tenant) ──────────────────────────────────

export async function dbGetUsers(sb: SupabaseClient, tenantId: string): Promise<User[]> {
  const { data, error } = await sb.from('users').select('*').eq('tenant_id', tenantId).order('created_at');
  if (error || !data) return [];
  return data.map(toUser);
}

// ── Full tenant hydration (single call to load everything) ───

export interface TenantData {
  tenant: Tenant;
  users: User[];
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];
}

export async function dbHydrateTenant(sb: SupabaseClient, tenantId: string): Promise<TenantData | null> {
  return withTenant(sb, tenantId, async () => {
    const tenant = await dbGetTenant(sb, tenantId);
    if (!tenant) return null;

    const [users, courts, items, members, bookings] = await Promise.all([
      dbGetUsers(sb, tenantId),
      dbGetCourts(sb, tenantId),
      dbGetItems(sb, tenantId),
      dbGetMembers(sb, tenantId),
      dbGetBookings(sb, tenantId),
    ]);

    return { tenant, users, courts, items, members, bookings };
  });
}
