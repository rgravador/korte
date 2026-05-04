export type UserRole = 'system_admin' | 'tenant_admin' | 'tenant_staff';

/** Returns true if the role has tenant admin privileges (tenant_admin or system_admin). */
export function isAdminRole(role: UserRole | string | undefined): boolean {
  return role === 'tenant_admin' || role === 'system_admin';
}

export type BookingStatus = 'confirmed' | 'pending' | 'checked_in' | 'no_show' | 'cancelled';

export type ItemType = 'rental' | 'sale';

export type MemberTier = 'regular' | 'vip';

export type SubscriptionStatus = 'trial' | 'active' | 'frozen';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  perExtraCourt: number;
  includedCourts: number;
  maxSports: number;
  maxCourts: number; // 0 = unlimited
  maxAdmins: number;
  maxStaff: number;
  isActive: boolean;
  isContactOnly: boolean;
  sortOrder: number;
  createdAt: string;
}

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
  operatingHoursRanges?: TimeRange[]; // multiple open windows — legacy, migrated to Sport
  freeTrialDays: number;
  subscriptionStatus: SubscriptionStatus;
  planTier: string | null;
  trialEndsAt: string | null;       // ISO 8601 timestamp
  currentPeriodEnd: string | null;  // ISO 8601 timestamp
  adminOverride: boolean;
  paymentMode: 'full' | 'downpayment';
  downpaymentPerHour: number;
  createdAt: string;
}

export interface Sport {
  id: string;
  tenantId: string;
  name: string;
  operatingHoursRanges: TimeRange[]; // e.g. [{start:6,end:12},{start:14,end:22}]
  isActive: boolean;
  createdAt: string;
}

/** Preset sports available during onboarding and settings. */
export const PRESET_SPORTS = [
  'Pickleball',
  'Badminton',
  'Basketball',
  'Tennis',
  'Volleyball',
  'Table Tennis',
] as const;

/** Entity that has operating hours — Sport or Tenant (backward compat). */
type HasOperatingHours = {
  operatingHoursRanges?: TimeRange[];
  operatingHoursStart?: number;
  operatingHoursEnd?: number;
};

/** Get all operating hours as a flat sorted array from a sport's or tenant's ranges. */
export function getOperatingHours(entity: HasOperatingHours): number[] {
  const ranges = entity.operatingHoursRanges?.length
    ? entity.operatingHoursRanges
    : (entity.operatingHoursStart != null && entity.operatingHoursEnd != null)
      ? [{ start: entity.operatingHoursStart, end: entity.operatingHoursEnd }]
      : [];

  const hoursSet = new Set<number>();
  for (const range of ranges) {
    for (let h = range.start; h < range.end; h++) {
      hoursSet.add(h);
    }
  }
  return Array.from(hoursSet).sort((a, b) => a - b);
}

/** Get the time ranges from a sport or tenant. */
export function getTimeRanges(entity: HasOperatingHours): TimeRange[] {
  if (entity.operatingHoursRanges?.length) return entity.operatingHoursRanges;
  if (entity.operatingHoursStart != null && entity.operatingHoursEnd != null) {
    return [{ start: entity.operatingHoursStart, end: entity.operatingHoursEnd }];
  }
  return [];
}

export interface Court {
  id: string;
  tenantId: string;
  sportId: string;
  name: string;
  hourlyRate: number; // in PHP (₱)
  isActive: boolean;
}

export interface Item {
  id: string;
  tenantId: string;
  sportId: string;
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
