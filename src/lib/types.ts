export type UserRole = 'system_admin' | 'tenant_admin' | 'tenant_staff';

export type BookingStatus = 'confirmed' | 'pending' | 'checked_in' | 'no_show' | 'cancelled';

export type ItemType = 'rental' | 'sale';

export type MemberTier = 'regular' | 'vip';

export interface User {
  id: string;
  tenantId: string;
  username: string;
  password: string; // plain text in mock, bcrypt hash in production
  role: UserRole;
  displayName: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

export interface TimeRange {
  start: number; // 24h format, e.g. 6
  end: number;   // 24h format, e.g. 12
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  courtCount: number;
  operatingHoursStart: number; // 24h format, e.g. 6 — legacy, used as fallback
  operatingHoursEnd: number;   // 24h format, e.g. 22 — legacy, used as fallback
  operatingHoursRanges?: TimeRange[]; // multiple open windows, e.g. [{start:6,end:12},{start:14,end:22}]
  createdAt: string;
}

/** Get all operating hours as a flat sorted array from a tenant's ranges or legacy fields. */
export function getOperatingHours(tenant: Tenant): number[] {
  const ranges = tenant.operatingHoursRanges?.length
    ? tenant.operatingHoursRanges
    : [{ start: tenant.operatingHoursStart, end: tenant.operatingHoursEnd }];

  const hoursSet = new Set<number>();
  for (const range of ranges) {
    for (let h = range.start; h < range.end; h++) {
      hoursSet.add(h);
    }
  }
  return Array.from(hoursSet).sort((a, b) => a - b);
}

/** Get the time ranges from a tenant (ranges if set, otherwise single range from legacy fields). */
export function getTimeRanges(tenant: Tenant): TimeRange[] {
  if (tenant.operatingHoursRanges?.length) return tenant.operatingHoursRanges;
  return [{ start: tenant.operatingHoursStart, end: tenant.operatingHoursEnd }];
}

export interface Court {
  id: string;
  tenantId: string;
  name: string;
  hourlyRate: number; // in PHP (₱)
  isActive: boolean;
}

export interface Item {
  id: string;
  tenantId: string;
  name: string;
  price: number; // in PHP (₱)
  type: ItemType;
  isActive: boolean;
}

export interface Member {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  tier: MemberTier;
  totalBookings: number;
  totalNoShows: number;
  lastVisit: string | null; // ISO date
  createdAt: string;
}

export interface BookingItem {
  itemId: string;
  itemName: string;
  itemType: ItemType;
  unitPrice: number;
  quantity: number;
}

export interface Booking {
  id: string;
  tenantId: string;
  courtId: string;
  memberId: string | null; // null for walk-ins
  memberName: string; // display name, "Walk-in" for anonymous
  date: string; // ISO date (YYYY-MM-DD)
  startHour: number; // 24h, e.g. 10
  durationMinutes: number;
  status: BookingStatus;
  courtFee: number;
  items: BookingItem[];
  itemsTotal: number;
  total: number; // courtFee + itemsTotal
  isRecurring: boolean;
  notes: string;
  createdAt: string;
}
