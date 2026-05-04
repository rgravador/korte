import { z } from 'zod';

// ── Shared ──────────────────────────────────────────────────

const TimeRangeSchema = z.object({
  start: z.number().int().min(0).max(23),
  end: z.number().int().min(1).max(24),
}).refine((d) => d.end > d.start, { message: 'end must be greater than start' });

const BookingItemSchema = z.object({
  itemId: z.string().uuid(),
  itemName: z.string().min(1),
  itemType: z.enum(['rental', 'sale']),
  unitPrice: z.number().min(0),
  quantity: z.number().int().min(1),
});

// ── Auth ────────────────────────────────────────────────────

export const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

export const RegisterSchema = z.object({
  name: z.string().min(1).max(200),
  subdomain: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/, 'lowercase alphanumeric and hyphens only'),
  operatingHoursStart: z.number().int().min(0).max(23).optional(),
  operatingHoursEnd: z.number().int().min(1).max(24).optional(),
  ownerName: z.string().min(1).max(200),
  ownerEmail: z.string().email().or(z.literal('')).default(''),
  ownerUsername: z.string().min(1).max(100),
  ownerPassword: z.string().min(6).max(200),
  sports: z.array(z.object({
    name: z.string().min(1).max(200),
    operatingHoursRanges: z.array(TimeRangeSchema).default([]),
    courts: z.array(z.object({
      name: z.string().min(1).max(200),
      hourlyRate: z.number().min(0),
    })).default([]),
  })).optional(),
  courts: z.array(z.object({
    name: z.string().min(1).max(200),
    hourlyRate: z.number().min(0),
  })).optional(),
});

// ── Bookings ────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  courtId: z.string().uuid(),
  memberId: z.string().uuid().nullable().default(null),
  memberName: z.string().min(1).max(200).default('Walk-in'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(0).max(23),
  durationMinutes: z.number().int().min(1),
  status: z.enum(['confirmed', 'pending', 'checked_in', 'no_show', 'cancelled']).default('pending'),
  courtFee: z.number().min(0).default(0),
  items: z.array(BookingItemSchema).default([]),
  itemsTotal: z.number().min(0).default(0),
  total: z.number().min(0).default(0),
  isRecurring: z.boolean().default(false),
  notes: z.string().max(2000).default(''),
});

export const UpdateBookingStatusSchema = z.object({
  bookingId: z.string().uuid(),
  status: z.enum(['confirmed', 'pending', 'checked_in', 'no_show', 'cancelled']),
});

export const RescheduleBookingSchema = z.object({
  bookingId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startHour: z.number().int().min(0).max(23),
});

// ── Courts ──────────────────────────────────────────────────

export const CreateCourtSchema = z.object({
  sportId: z.string().uuid(),
  name: z.string().min(1).max(200),
  hourlyRate: z.number().min(0),
});

export const UpdateCourtSchema = z.object({
  courtId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  hourlyRate: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const DeleteCourtSchema = z.object({
  courtId: z.string().uuid(),
});

// ── Items ───────────────────────────────────────────────────

export const CreateItemSchema = z.object({
  sportId: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  price: z.number().min(0),
  type: z.enum(['rental', 'sale']),
});

export const UpdateItemSchema = z.object({
  itemId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  price: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const DeleteItemSchema = z.object({
  itemId: z.string().uuid(),
});

// ── Members ─────────────────────────────────────────────────

export const CreateMemberSchema = z.object({
  firstName: z.string().min(1).max(200),
  lastName: z.string().min(1).max(200),
  phone: z.string().max(50).default(''),
  email: z.string().email().or(z.literal('')).default(''),
  tier: z.enum(['regular', 'vip']).default('regular'),
});

export const UpdateMemberSchema = z.object({
  memberId: z.string().uuid(),
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().min(1).max(200).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().or(z.literal('')).optional(),
  tier: z.enum(['regular', 'vip']).optional(),
  totalBookings: z.number().int().min(0).optional(),
  totalNoShows: z.number().int().min(0).optional(),
  lastVisit: z.string().nullable().optional(),
});

// ── Sports ──────────────────────────────────────────────────

export const CreateSportSchema = z.object({
  name: z.string().min(1).max(200),
  operatingHoursRanges: z.array(TimeRangeSchema).default([]),
});

export const UpdateSportSchema = z.object({
  sportId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  operatingHoursRanges: z.array(TimeRangeSchema).optional(),
  isActive: z.boolean().optional(),
});

export const DeleteSportSchema = z.object({
  sportId: z.string().uuid(),
});

// ── Tenant ──────────────────────────────────────────────────

export const UpdateTenantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  operatingHoursStart: z.number().int().min(0).max(23).optional(),
  operatingHoursEnd: z.number().int().min(1).max(24).optional(),
  operatingHoursRanges: z.array(TimeRangeSchema).optional(),
  freeTrialDays: z.number().int().min(0).max(365).optional(),
});

// ── Users ───────────────────────────────────────────────────

export const CreateUserSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(6).max(200),
  role: z.enum(['system_admin', 'tenant_admin', 'tenant_staff']),
  displayName: z.string().min(1).max(200),
  email: z.string().email().or(z.literal('')).default(''),
});

// ── Admin ───────────────────────────────────────────────────

export const AdminUpdateTenantSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(200).optional(),
  operatingHoursStart: z.number().int().min(0).max(23).optional(),
  operatingHoursEnd: z.number().int().min(1).max(24).optional(),
  freeTrialDays: z.number().int().min(0).max(365).optional(),
  subscriptionStatus: z.enum(['trial', 'active', 'frozen']).optional(),
  planTier: z.string().min(1).max(100).nullable().optional(),
  currentPeriodEnd: z.string().datetime().nullable().optional(),
  trialEndsAt: z.string().datetime().nullable().optional(),
  adminOverride: z.boolean().optional(),
});

// ── Plans ───────────────────────────────────────────────────

export const CreatePlanSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'lowercase alphanumeric and underscores only'),
  description: z.string().max(500).nullable().optional(),
  basePrice: z.number().int().min(0),
  perExtraCourt: z.number().int().min(0).optional(),
  includedCourts: z.number().int().min(0).optional(),
  maxSports: z.number().int().min(0).optional(),
  maxCourts: z.number().int().min(0).optional(),
  maxAdmins: z.number().int().min(0).optional(),
  maxStaff: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isContactOnly: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const UpdatePlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'lowercase alphanumeric and underscores only').optional(),
  description: z.string().max(500).nullable().optional(),
  basePrice: z.number().int().min(0).optional(),
  perExtraCourt: z.number().int().min(0).optional(),
  includedCourts: z.number().int().min(0).optional(),
  maxSports: z.number().int().min(0).optional(),
  maxCourts: z.number().int().min(0).optional(),
  maxAdmins: z.number().int().min(0).optional(),
  maxStaff: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  isContactOnly: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// ── Helpers ─────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { data: T } | { error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const messages = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return { error: messages };
  }
  return { data: result.data };
}
