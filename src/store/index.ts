import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant, Court, Item, Member, Booking, BookingStatus, ItemType, UserRole } from '@/lib/types';
import {
  seedUsers,
  seedTenant,
  seedCourts,
  seedItems,
  seedMembers,
  seedBookings,
} from '@/lib/mock-data';
import { enqueue } from '@/lib/sync';

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

  // Utility
  resetData: () => void;
  resetToFresh: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: seedUsers,

      isOnline: true,
      pendingSync: 0,
      lastSyncedAt: null,

      isOnboarded: false,
      tenant: seedTenant,
      courts: seedCourts,
      items: seedItems,
      members: seedMembers,
      bookings: seedBookings,

      login: (username, password) => {
        // First try matching stored users (passwords may be empty after rehydration)
        let user = get().users.find(
          (u) => u.username === username && u.password === password && u.isActive
        );

        // Fallback: check seed data passwords (demo mode — passwords are stripped from localStorage)
        if (!user) {
          const seedUser = seedUsers.find(
            (u) => u.username === username && u.password === password && u.isActive
          );
          if (seedUser) {
            // Verify this seed user exists in the store (by username)
            user = get().users.find((u) => u.username === seedUser.username && u.isActive);
          }
        }

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
          id,
          tenantId,
          username: data.username,
          password: data.password,
          role: data.role,
          displayName: data.displayName,
          email: data.email,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ users: [...state.users, user] }));

        enqueue({
          kind: 'createUser',
          payload: { tenantId, ...data },
        });

        return id;
      },

      createBooking: (bookingData) => {
        const id = `booking-${generateId()}`;
        const booking: Booking = {
          ...bookingData,
          id,
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

        enqueue({
          kind: 'createBooking',
          payload: bookingData as unknown as Record<string, unknown>,
        });

        return id;
      },

      updateBookingStatus: (bookingId, status) => {
        set((state) => ({
          bookings: state.bookings.map((b) => {
            if (b.id !== bookingId) return b;
            return { ...b, status };
          }),
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

        enqueue({
          kind: 'updateBookingStatus',
          payload: { bookingId, status },
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

        enqueue({
          kind: 'rescheduleBooking',
          payload: { bookingId, date, startHour },
        });
      },

      addMember: (memberData) => {
        const id = `member-${generateId()}`;
        const member: Member = {
          ...memberData,
          id,
          totalBookings: 0,
          totalNoShows: 0,
          lastVisit: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ members: [...state.members, member] }));

        enqueue({
          kind: 'addMember',
          payload: {
            tenantId: memberData.tenantId,
            firstName: memberData.firstName,
            lastName: memberData.lastName,
            phone: memberData.phone,
            email: memberData.email,
            tier: memberData.tier,
          },
        });

        return id;
      },

      updateMember: (memberId, updates) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        }));

        enqueue({
          kind: 'updateMember',
          payload: { memberId, updates: updates as Record<string, unknown> },
        });
      },

      addCourt: (courtData) => {
        const id = `court-${generateId()}`;
        const court: Court = { ...courtData, id };
        set((state) => ({
          courts: [...state.courts, court],
          tenant: { ...state.tenant, courtCount: state.courts.length + 1 },
        }));

        enqueue({
          kind: 'addCourt',
          payload: { tenantId: courtData.tenantId, name: courtData.name, hourlyRate: courtData.hourlyRate },
        });

        return id;
      },

      updateCourt: (courtId, updates) => {
        set((state) => ({
          courts: state.courts.map((c) =>
            c.id === courtId ? { ...c, ...updates } : c
          ),
        }));

        enqueue({
          kind: 'updateCourt',
          payload: { courtId, updates: updates as Record<string, unknown> },
        });
      },

      removeCourt: (courtId) => {
        set((state) => ({
          courts: state.courts.filter((c) => c.id !== courtId),
          tenant: { ...state.tenant, courtCount: state.courts.length - 1 },
        }));

        enqueue({ kind: 'removeCourt', payload: { courtId } });
      },

      addItem: (itemData) => {
        const id = `item-${generateId()}`;
        const item: Item = { ...itemData, id };
        set((state) => ({ items: [...state.items, item] }));

        enqueue({
          kind: 'addItem',
          payload: { tenantId: itemData.tenantId, name: itemData.name, price: itemData.price, type: itemData.type },
        });

        return id;
      },

      updateItem: (itemId, updates) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        }));

        enqueue({
          kind: 'updateItem',
          payload: { itemId, updates: updates as Record<string, unknown> },
        });
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));

        enqueue({ kind: 'removeItem', payload: { itemId } });
      },

      updateTenant: (updates) => {
        const tenantId = get().tenant.id;
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));

        enqueue({
          kind: 'updateTenant',
          payload: { tenantId, updates: updates as Record<string, unknown> },
        });
      },

      setupTenant: (data) => {
        const tenantId = `tenant-${generateId()}`;
        const tenant: Tenant = {
          id: tenantId,
          name: data.name,
          subdomain: data.subdomain,
          courtCount: data.courts.length,
          operatingHoursStart: data.operatingHoursStart,
          operatingHoursEnd: data.operatingHoursEnd,
          createdAt: new Date().toISOString(),
        };
        const courts: Court[] = data.courts.map((c, i) => ({
          id: `court-${generateId()}-${i}`,
          tenantId,
          name: c.name,
          hourlyRate: c.hourlyRate,
          isActive: true,
        }));
        const items: Item[] = data.items.map((item, i) => ({
          id: `item-${generateId()}-${i}`,
          tenantId,
          name: item.name,
          price: item.price,
          type: item.type,
          isActive: true,
        }));
        const adminUser: User = {
          id: `user-${generateId()}`,
          tenantId,
          username: data.ownerUsername,
          password: data.ownerPassword,
          role: 'tenant_admin',
          displayName: data.ownerName,
          email: data.ownerEmail,
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        set({
          isOnboarded: true,
          currentUser: adminUser,
          users: [adminUser],
          tenant,
          courts,
          items,
          members: [],
          bookings: [],
        });
        // Supabase setup is handled by setupTenantOnline() in the onboarding page
      },

      // Sync actions
      setOnline: (online) => set({ isOnline: online }),
      setPendingSync: (count) => set({ pendingSync: count }),
      setLastSynced: (ts) => set({ lastSyncedAt: ts }),

      hydrateFromRemote: (data) => {
        set({
          isOnboarded: true,
          tenant: data.tenant,
          users: data.users,
          courts: data.courts,
          items: data.items,
          members: data.members,
          bookings: data.bookings,
          lastSyncedAt: new Date().toISOString(),
        });
      },

      resetData: () => {
        // Clear sync queue — demo data is local-only
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('court-books-sync-queue');
        }
        set({
          isOnboarded: true,
          currentUser: seedUsers[0],
          users: seedUsers,
          tenant: seedTenant,
          courts: seedCourts,
          items: seedItems,
          members: seedMembers,
          bookings: seedBookings,
          lastSyncedAt: null,
          pendingSync: 0,
        });
      },

      resetToFresh: () => {
        // Clear sync queue so stale mutations don't replay
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('court-books-sync-queue');
        }
        set({
          isOnboarded: false,
          currentUser: null,
          users: [],
          tenant: seedTenant,
          courts: [],
          items: [],
          members: [],
          bookings: [],
          lastSyncedAt: null,
          pendingSync: 0,
        });
      },
    }),
    {
      name: 'court-books-store',
      partialize: (state) => ({
        // Persist everything except transient sync state and passwords
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
