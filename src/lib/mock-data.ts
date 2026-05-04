import { User, Tenant, Court, Item, Member, Booking } from './types';

const today = new Date();
const todayStr = today.toISOString().split('T')[0];
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split('T')[0];
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
const dayAfter = new Date(today);
dayAfter.setDate(today.getDate() + 2);
const dayAfterStr = dayAfter.toISOString().split('T')[0];

const TENANT_ID = 'tenant-001';

export const seedUsers: User[] = [
  {
    id: 'user-1', tenantId: TENANT_ID,
    username: 'marco', password: 'admin123',
    role: 'tenant_admin', displayName: 'Marco Reyes',
    email: 'marco@qcpicklehub.com', isActive: true,
    createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'user-2', tenantId: TENANT_ID,
    username: 'lia', password: 'staff123',
    role: 'tenant_staff', displayName: 'Lia Santos',
    email: 'lia@qcpicklehub.com', isActive: true,
    createdAt: '2026-03-05T00:00:00Z',
  },
];

export const seedTenant: Tenant = {
  id: TENANT_ID,
  name: 'QC Pickle Hub',
  subdomain: 'qcpicklehub',
  courtCount: 3,
  operatingHoursStart: 6,
  operatingHoursEnd: 22,
  freeTrialDays: 7,
  subscriptionStatus: 'trial',
  planTier: null,
  trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  currentPeriodEnd: null,
  adminOverride: false,
  createdAt: '2026-03-01T00:00:00Z',
};

export const seedCourts: Court[] = [
  { id: 'court-1', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Court 1', hourlyRate: 400, isActive: true },
  { id: 'court-2', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Court 2', hourlyRate: 500, isActive: true },
  { id: 'court-3', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Court 3', hourlyRate: 400, isActive: true },
];

export const seedItems: Item[] = [
  { id: 'item-1', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Paddle Rental', price: 100, type: 'rental', isActive: true },
  { id: 'item-2', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Shoe Rental', price: 80, type: 'rental', isActive: true },
  { id: 'item-3', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Towel Rental', price: 50, type: 'rental', isActive: true },
  { id: 'item-4', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Pickleball (Franklin X-40)', price: 250, type: 'sale', isActive: true },
  { id: 'item-5', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Grip Tape', price: 150, type: 'sale', isActive: true },
  { id: 'item-6', tenantId: TENANT_ID, sportId: 'sport-1', name: 'Bottled Water', price: 35, type: 'sale', isActive: true },
];

export const seedMembers: Member[] = [
  {
    id: 'member-1', tenantId: TENANT_ID,
    firstName: 'Andrea', lastName: 'Reyes',
    phone: '+639171234567', email: 'andrea.reyes@email.com',
    tier: 'vip', totalBookings: 14, totalNoShows: 0,
    lastVisit: yesterdayStr, createdAt: '2026-03-05T00:00:00Z',
  },
  {
    id: 'member-2', tenantId: TENANT_ID,
    firstName: 'Joaquin', lastName: 'Cruz',
    phone: '+639182345678', email: 'joaquin.cruz@email.com',
    tier: 'regular', totalBookings: 9, totalNoShows: 1,
    lastVisit: yesterdayStr, createdAt: '2026-03-10T00:00:00Z',
  },
  {
    id: 'member-3', tenantId: TENANT_ID,
    firstName: 'Marisol', lastName: 'Santos',
    phone: '+639193456789', email: 'marisol.santos@email.com',
    tier: 'vip', totalBookings: 22, totalNoShows: 0,
    lastVisit: todayStr, createdAt: '2026-03-02T00:00:00Z',
  },
  {
    id: 'member-4', tenantId: TENANT_ID,
    firstName: 'Paolo', lastName: 'Delgado',
    phone: '+639204567890', email: 'paolo.d@email.com',
    tier: 'regular', totalBookings: 5, totalNoShows: 2,
    lastVisit: '2026-04-09T00:00:00Z', createdAt: '2026-03-15T00:00:00Z',
  },
  {
    id: 'member-5', tenantId: TENANT_ID,
    firstName: 'Rina', lastName: 'Katigbak',
    phone: '+639215678901', email: 'rina.k@email.com',
    tier: 'vip', totalBookings: 31, totalNoShows: 1,
    lastVisit: yesterdayStr, createdAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 'member-6', tenantId: TENANT_ID,
    firstName: 'Enrico', lastName: 'Velasco',
    phone: '+639226789012', email: 'enrico.v@email.com',
    tier: 'regular', totalBookings: 2, totalNoShows: 1,
    lastVisit: '2026-02-28T00:00:00Z', createdAt: '2026-02-20T00:00:00Z',
  },
  {
    id: 'member-7', tenantId: TENANT_ID,
    firstName: 'Bianca', lastName: 'Lim',
    phone: '+639237890123', email: 'bianca.lim@email.com',
    tier: 'regular', totalBookings: 7, totalNoShows: 0,
    lastVisit: todayStr, createdAt: '2026-03-20T00:00:00Z',
  },
  {
    id: 'member-8', tenantId: TENANT_ID,
    firstName: 'Carlos', lastName: 'Tan',
    phone: '+639248901234', email: 'carlos.tan@email.com',
    tier: 'regular', totalBookings: 4, totalNoShows: 0,
    lastVisit: yesterdayStr, createdAt: '2026-04-01T00:00:00Z',
  },
];

export const seedBookings: Booking[] = [
  // Today's bookings
  {
    id: 'booking-1', tenantId: TENANT_ID, courtId: 'court-2', memberId: 'member-1',
    memberName: 'A. Reyes + 3', date: todayStr, startHour: 10, durationMinutes: 60,
    status: 'confirmed', courtFee: 500,
    items: [
      { itemId: 'item-1', itemName: 'Paddle Rental', itemType: 'rental', unitPrice: 100, quantity: 2 },
    ],
    itemsTotal: 200, total: 700, isRecurring: false, notes: '', createdAt: '2026-04-28T10:00:00Z',
  },
  {
    id: 'booking-2', tenantId: TENANT_ID, courtId: 'court-3', memberId: 'member-3',
    memberName: 'Tue Open League', date: todayStr, startHour: 10, durationMinutes: 90,
    status: 'checked_in', courtFee: 400,
    items: [], itemsTotal: 0, total: 400, isRecurring: true, notes: '8 players', createdAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'booking-3', tenantId: TENANT_ID, courtId: 'court-1', memberId: 'member-2',
    memberName: 'J. Cruz', date: todayStr, startHour: 11, durationMinutes: 60,
    status: 'pending', courtFee: 400,
    items: [
      { itemId: 'item-4', itemName: 'Pickleball (Franklin X-40)', itemType: 'sale', unitPrice: 250, quantity: 1 },
    ],
    itemsTotal: 250, total: 650, isRecurring: false, notes: '', createdAt: '2026-04-29T14:00:00Z',
  },
  {
    id: 'booking-4', tenantId: TENANT_ID, courtId: 'court-2', memberId: 'member-3',
    memberName: 'M. Santos', date: todayStr, startHour: 13, durationMinutes: 60,
    status: 'confirmed', courtFee: 500,
    items: [], itemsTotal: 0, total: 500, isRecurring: false, notes: '', createdAt: '2026-04-28T16:00:00Z',
  },
  {
    id: 'booking-5', tenantId: TENANT_ID, courtId: 'court-1', memberId: 'member-5',
    memberName: 'R. Katigbak', date: todayStr, startHour: 15, durationMinutes: 60,
    status: 'confirmed', courtFee: 400,
    items: [
      { itemId: 'item-1', itemName: 'Paddle Rental', itemType: 'rental', unitPrice: 100, quantity: 1 },
      { itemId: 'item-6', itemName: 'Bottled Water', itemType: 'sale', unitPrice: 35, quantity: 2 },
    ],
    itemsTotal: 170, total: 570, isRecurring: false, notes: '', createdAt: '2026-04-29T09:00:00Z',
  },
  {
    id: 'booking-6', tenantId: TENANT_ID, courtId: 'court-3', memberId: 'member-4',
    memberName: 'P. Delgado', date: todayStr, startHour: 14, durationMinutes: 120,
    status: 'confirmed', courtFee: 800,
    items: [], itemsTotal: 0, total: 800, isRecurring: false, notes: '', createdAt: '2026-04-28T11:00:00Z',
  },
  {
    id: 'booking-7', tenantId: TENANT_ID, courtId: 'court-1', memberId: null,
    memberName: 'Walk-in', date: todayStr, startHour: 9, durationMinutes: 60,
    status: 'checked_in', courtFee: 400,
    items: [
      { itemId: 'item-1', itemName: 'Paddle Rental', itemType: 'rental', unitPrice: 100, quantity: 2 },
      { itemId: 'item-2', itemName: 'Shoe Rental', itemType: 'rental', unitPrice: 80, quantity: 1 },
    ],
    itemsTotal: 280, total: 680, isRecurring: false, notes: '', createdAt: '2026-04-30T08:50:00Z',
  },
  // Yesterday — one no-show
  {
    id: 'booking-8', tenantId: TENANT_ID, courtId: 'court-2', memberId: 'member-6',
    memberName: 'E. Velasco', date: yesterdayStr, startHour: 10, durationMinutes: 60,
    status: 'no_show', courtFee: 500,
    items: [], itemsTotal: 0, total: 500, isRecurring: false, notes: '', createdAt: '2026-04-27T10:00:00Z',
  },
  {
    id: 'booking-9', tenantId: TENANT_ID, courtId: 'court-1', memberId: 'member-7',
    memberName: 'B. Lim', date: yesterdayStr, startHour: 14, durationMinutes: 60,
    status: 'checked_in', courtFee: 400,
    items: [], itemsTotal: 0, total: 400, isRecurring: false, notes: '', createdAt: '2026-04-27T12:00:00Z',
  },
  {
    id: 'booking-10', tenantId: TENANT_ID, courtId: 'court-3', memberId: 'member-8',
    memberName: 'C. Tan', date: yesterdayStr, startHour: 16, durationMinutes: 60,
    status: 'checked_in', courtFee: 400,
    items: [
      { itemId: 'item-1', itemName: 'Paddle Rental', itemType: 'rental', unitPrice: 100, quantity: 1 },
    ],
    itemsTotal: 100, total: 500, isRecurring: false, notes: '', createdAt: '2026-04-27T09:00:00Z',
  },
  // Tomorrow
  {
    id: 'booking-11', tenantId: TENANT_ID, courtId: 'court-1', memberId: 'member-1',
    memberName: 'A. Reyes', date: tomorrowStr, startHour: 10, durationMinutes: 60,
    status: 'confirmed', courtFee: 400,
    items: [], itemsTotal: 0, total: 400, isRecurring: false, notes: '', createdAt: '2026-04-29T10:00:00Z',
  },
  {
    id: 'booking-12', tenantId: TENANT_ID, courtId: 'court-2', memberId: 'member-5',
    memberName: 'R. Katigbak', date: tomorrowStr, startHour: 18, durationMinutes: 60,
    status: 'confirmed', courtFee: 500,
    items: [], itemsTotal: 0, total: 500, isRecurring: true, notes: 'Weekly regular', createdAt: '2026-04-15T10:00:00Z',
  },
  // Day after tomorrow
  {
    id: 'booking-13', tenantId: TENANT_ID, courtId: 'court-3', memberId: 'member-2',
    memberName: 'J. Cruz + 1', date: dayAfterStr, startHour: 19, durationMinutes: 60,
    status: 'pending', courtFee: 400,
    items: [
      { itemId: 'item-1', itemName: 'Paddle Rental', itemType: 'rental', unitPrice: 100, quantity: 2 },
      { itemId: 'item-4', itemName: 'Pickleball (Franklin X-40)', itemType: 'sale', unitPrice: 250, quantity: 1 },
    ],
    itemsTotal: 450, total: 850, isRecurring: false, notes: '', createdAt: '2026-04-29T18:00:00Z',
  },
  {
    id: 'booking-14', tenantId: TENANT_ID, courtId: 'court-1', memberId: 'member-7',
    memberName: 'B. Lim', date: dayAfterStr, startHour: 8, durationMinutes: 60,
    status: 'confirmed', courtFee: 400,
    items: [], itemsTotal: 0, total: 400, isRecurring: false, notes: 'Early bird', createdAt: '2026-04-29T20:00:00Z',
  },
  {
    id: 'booking-15', tenantId: TENANT_ID, courtId: 'court-2', memberId: 'member-3',
    memberName: 'M. Santos', date: tomorrowStr, startHour: 10, durationMinutes: 60,
    status: 'confirmed', courtFee: 500,
    items: [], itemsTotal: 0, total: 500, isRecurring: false, notes: '', createdAt: '2026-04-29T11:00:00Z',
  },
];
