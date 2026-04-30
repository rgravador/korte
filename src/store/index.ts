import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant, Court, Item, Member, Booking, BookingStatus, ItemType, UserRole } from '@/lib/types';
import { seedTenant } from '@/lib/mock-data';
import { getSupabase } from '@/lib/supabase';
import {
  dbCreateBooking, dbUpdateBookingStatus, dbRescheduleBooking,
  dbAddMember, dbUpdateMember,
  dbAddCourt, dbUpdateCourt, dbRemoveCourt,
  dbAddItem, dbUpdateItem, dbRemoveItem,
  dbUpdateTenant, dbCreateUser,
} from '@/lib/db';

/** Fire a Supabase call if configured. Log errors but never block the UI. */
function fireAndForget(fn: () => Promise<unknown>) {
  const sb = getSupabase();
  if (!sb) return;
  fn().catch((err) => console.error('[store] Supabase sync error:', err));
}

interface AppState {
  // Auth
  currentUser: User | null;
  users: User[];

  // Sync
  isOnline: boolean;
  pendingSync: number;
  lastSyncedAt: string | null;

  isOnboarded: boolean;
  tenant: Tenant;
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];

  // Auth actions
  login: (username: string, password: string) => User | null;
  logout: () => void;
  createUser: (data: { username: string; password: string; role: UserRole; displayName: string; email: string }) => string;

  // Booking actions
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => string;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  cancelBooking: (bookingId: string) => void;
  rescheduleBooking: (bookingId: string, date: string, startHour: number) => void;

  // Member actions
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'totalBookings' | 'totalNoShows' | 'lastVisit'>) => string;
  updateMember: (memberId: string, updates: Partial<Member>) => void;

  // Court actions
  addCourt: (court: Omit<Court, 'id'>) => string;
  updateCourt: (courtId: string, updates: Partial<Court>) => void;
  removeCourt: (courtId: string) => void;

  // Item actions
  addItem: (item: Omit<Item, 'id'>) => string;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  removeItem: (itemId: string) => void;

  // Tenant actions
  updateTenant: (updates: Partial<Tenant>) => void;
  setupTenant: (data: {
    name: string;
    ownerName: string;
    ownerEmail: string;
    ownerUsername: string;
    ownerPassword: string;
    subdomain: string;
    operatingHoursStart: number;
    operatingHoursEnd: number;
    courts: { name: string; hourlyRate: number }[];
    items: { name: string; price: number; type: ItemType }[];
  }) => void;

  // Sync actions
  setOnline: (online: boolean) => void;
  setPendingSync: (count: number) => void;
  setLastSynced: (ts: string) => void;
  hydrateFromRemote: (data: {
    tenant: Tenant;
    users: User[];
    courts: Court[];
    items: Item[];
    members: Member[];
    bookings: Booking[];
  }) => void;

}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],

      isOnline: true,
      pendingSync: 0,
      lastSyncedAt: null,

      isOnboarded: false,
      tenant: seedTenant,
      courts: [],
      items: [],
      members: [],
      bookings: [],

      login: (username, password) => {
        const user = get().users.find(
          (u) => u.username === username && u.password === password && u.isActive
        );
        if (user) {
          set({ currentUser: user });
          return user;
        }
        return null;
      },

      logout: () => {
        set({ currentUser: null });
      },

      createUser: (data) => {
        const id = `user-${generateId()}`;
        const tenantId = get().tenant.id;
        const user: User = {
          id, tenantId,
          username: data.username, password: data.password,
          role: data.role, displayName: data.displayName,
          email: data.email, isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbCreateUser(sb, tenantId, data);
        });

        return id;
      },

      createBooking: (bookingData) => {
        const id = `booking-${generateId()}`;
        const booking: Booking = {
          ...bookingData, id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ bookings: [...state.bookings, booking] }));

        if (bookingData.memberId) {
          const member = get().members.find((m) => m.id === bookingData.memberId);
          if (member) {
            get().updateMember(bookingData.memberId, {
              totalBookings: member.totalBookings + 1,
              lastVisit: bookingData.date,
            });
          }
        }

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbCreateBooking(sb, bookingData);
        });

        return id;
      },

      updateBookingStatus: (bookingId, status) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id !== bookingId ? b : { ...b, status }
          ),
        }));

        if (status === 'no_show') {
          const booking = get().bookings.find((b) => b.id === bookingId);
          if (booking?.memberId) {
            const member = get().members.find((m) => m.id === booking.memberId);
            if (member) {
              get().updateMember(booking.memberId, {
                totalNoShows: member.totalNoShows + 1,
              });
            }
          }
        }

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbUpdateBookingStatus(sb, bookingId, status);
        });
      },

      cancelBooking: (bookingId) => {
        get().updateBookingStatus(bookingId, 'cancelled');
      },

      rescheduleBooking: (bookingId, date, startHour) => {
        set((state) => ({
          bookings: state.bookings.map((b) =>
            b.id === bookingId ? { ...b, date, startHour } : b
          ),
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbRescheduleBooking(sb, bookingId, date, startHour);
        });
      },

      addMember: (memberData) => {
        const id = `member-${generateId()}`;
        const member: Member = {
          ...memberData, id,
          totalBookings: 0, totalNoShows: 0,
          lastVisit: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ members: [...state.members, member] }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbAddMember(sb, {
            tenantId: memberData.tenantId,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            phone: memberData.phone,
            email: memberData.email,
            tier: memberData.tier,
          });
        });

        return id;
      },

      updateMember: (memberId, updates) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbUpdateMember(sb, memberId, updates);
        });
      },

      addCourt: (courtData) => {
        const id = `court-${generateId()}`;
        const court: Court = { ...courtData, id };
        set((state) => ({
          courts: [...state.courts, court],
          tenant: { ...state.tenant, courtCount: state.courts.length + 1 },
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbAddCourt(sb, { tenantId: courtData.tenantId, name: courtData.name, hourlyRate: courtData.hourlyRate });
        });

        return id;
      },

      updateCourt: (courtId, updates) => {
        set((state) => ({
          courts: state.courts.map((c) =>
            c.id === courtId ? { ...c, ...updates } : c
          ),
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbUpdateCourt(sb, courtId, updates);
        });
      },

      removeCourt: (courtId) => {
        set((state) => ({
          courts: state.courts.filter((c) => c.id !== courtId),
          tenant: { ...state.tenant, courtCount: state.courts.length - 1 },
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbRemoveCourt(sb, courtId);
        });
      },

      addItem: (itemData) => {
        const id = `item-${generateId()}`;
        const item: Item = { ...itemData, id };
        set((state) => ({ items: [...state.items, item] }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbAddItem(sb, { tenantId: itemData.tenantId, name: itemData.name, price: itemData.price, type: itemData.type });
        });

        return id;
      },

      updateItem: (itemId, updates) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbUpdateItem(sb, itemId, updates);
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbRemoveItem(sb, itemId);
        });
      },

      updateTenant: (updates) => {
        const tenantId = get().tenant.id;
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));

        fireAndForget(async () => {
          const sb = getSupabase()!;
          await dbUpdateTenant(sb, tenantId, updates);
        });
      },

      setupTenant: (data) => {
        const tenantId = `tenant-${generateId()}`;
        const tenant: Tenant = {
          id: tenantId, name: data.name, subdomain: data.subdomain,
          courtCount: data.courts.length,
          operatingHoursStart: data.operatingHoursStart,
          operatingHoursEnd: data.operatingHoursEnd,
          createdAt: new Date().toISOString(),
        };
        const courts: Court[] = data.courts.map((c, i) => ({
          id: `court-${generateId()}-${i}`, tenantId,
          name: c.name, hourlyRate: c.hourlyRate, isActive: true,
        }));
        const items: Item[] = data.items.map((item, i) => ({
          id: `item-${generateId()}-${i}`, tenantId,
          name: item.name, price: item.price, type: item.type, isActive: true,
        }));
        const adminUser: User = {
          id: `user-${generateId()}`, tenantId,
          username: data.ownerUsername, password: data.ownerPassword,
          role: 'tenant_admin', displayName: data.ownerName,
          email: data.ownerEmail, isActive: true,
          createdAt: new Date().toISOString(),
        };
        set({
          isOnboarded: true, currentUser: adminUser,
          users: [adminUser], tenant, courts, items,
          members: [], bookings: [],
        });
        // Supabase setup handled by setupTenantOnline() in onboarding page
      },

      // Sync actions
      setOnline: (online) => set({ isOnline: online }),
      setPendingSync: (count) => set({ pendingSync: count }),
      setLastSynced: (ts) => set({ lastSyncedAt: ts }),

      hydrateFromRemote: (data) => {
        set({
          isOnboarded: true,
          tenant: data.tenant, users: data.users,
          courts: data.courts, items: data.items,
          members: data.members, bookings: data.bookings,
          lastSyncedAt: new Date().toISOString(),
        });
      },
    }),
    {
      name: 'court-books-store',
      partialize: (state) => ({
        currentUser: state.currentUser ? { ...state.currentUser, password: '' } : null,
        users: state.users.map((u) => ({ ...u, password: '' })),
        isOnboarded: state.isOnboarded,
        tenant: state.tenant,
        courts: state.courts,
        items: state.items,
        members: state.members,
        bookings: state.bookings,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
