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

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  courtCount: number;
  operatingHoursStart: number; // 24h format, e.g. 6
  operatingHoursEnd: number;   // 24h format, e.g. 22
  createdAt: string;
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
