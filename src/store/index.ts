import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, Tenant, Court, Item, Member, Booking, BookingStatus, ItemType, UserRole } from '@/lib/types';
import {
  apiCreateBooking, apiUpdateBookingStatus, apiRescheduleBooking,
  apiAddMember, apiUpdateMember,
  apiAddCourt, apiUpdateCourt, apiRemoveCourt,
  apiAddItem, apiUpdateItem, apiRemoveItem,
  apiUpdateTenant, apiCreateUser, apiHydrate,
} from '@/lib/api';
import { toast } from '@/components/toast';

const EMPTY_TENANT: Tenant = {
  id: '', name: '', subdomain: '', courtCount: 0,
  operatingHoursStart: 6, operatingHoursEnd: 22, createdAt: '',
};

interface AppState {
  currentUser: User | null;
  users: User[];
  isOnline: boolean;
  pendingSync: number;
  lastSyncedAt: string | null;
  isOnboarded: boolean;
  tenant: Tenant;
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];
  _hasHydrated: boolean;

  login: (username: string, password: string) => User | null;
  logout: () => void;
  createUser: (data: { username: string; password: string; role: UserRole; displayName: string; email: string }) => Promise<string>;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Promise<string>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  rescheduleBooking: (bookingId: string, date: string, startHour: number) => Promise<void>;
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'totalBookings' | 'totalNoShows' | 'lastVisit'>) => Promise<string>;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  addCourt: (court: Omit<Court, 'id'>) => Promise<string>;
  updateCourt: (courtId: string, updates: Partial<Court>) => Promise<void>;
  removeCourt: (courtId: string) => Promise<void>;
  addItem: (item: Omit<Item, 'id'>) => Promise<string>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateTenant: (updates: Partial<Tenant>) => Promise<void>;
  setOnline: (online: boolean) => void;
  setPendingSync: (count: number) => void;
  setLastSynced: (ts: string) => void;
  hydrateFromRemote: (data: {
    tenant: Tenant; users: User[]; courts: Court[];
    items: Item[]; members: Member[]; bookings: Booking[];
  }) => void;
  refreshFromServer: () => Promise<void>;
}

const isBrowser = typeof window !== 'undefined';

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, users: [],
      isOnline: true, pendingSync: 0, lastSyncedAt: null,
      isOnboarded: false, tenant: EMPTY_TENANT,
      courts: [], items: [], members: [], bookings: [],
      _hasHydrated: false,

      login: (username, password) => {
        console.debug('[store] login', { username });
        const user = get().users.find((u) => u.username === username && u.password === password && u.isActive);
        if (user) { set({ currentUser: user }); return user; }
        return null;
      },

      logout: () => {
        console.debug('[store] logout');
        set({ currentUser: null, isOnboarded: false, users: [], tenant: EMPTY_TENANT, courts: [], items: [], members: [], bookings: [] });
      },

      createUser: async (data) => {
        console.debug('[store] createUser', { username: data.username, role: data.role });
        const tenantId = get().tenant.id;
        const result = await apiCreateUser({ tenantId, ...data });
        if (!result) throw new Error('Failed to create user');
        set((state) => ({ users: [...state.users, result] }));
        return result.id;
      },

      createBooking: async (bookingData) => {
        console.debug('[store] createBooking', { courtId: bookingData.courtId, date: bookingData.date, startHour: bookingData.startHour });
        const result = await apiCreateBooking(bookingData);
        if (!result) throw new Error('Failed to create booking');
        set((state) => ({ bookings: [...state.bookings, result] }));
        if (bookingData.memberId) {
          const member = get().members.find((m) => m.id === bookingData.memberId);
          if (member) {
            await get().updateMember(bookingData.memberId, { totalBookings: member.totalBookings + 1, lastVisit: bookingData.date }).catch(() => { toast.error('Could not update member stats, but the booking was saved.'); });
          }
        }
        return result.id;
      },

      updateBookingStatus: async (bookingId, status) => {
        console.debug('[store] updateBookingStatus', { bookingId, status });
        const success = await apiUpdateBookingStatus(bookingId, status);
        if (!success) throw new Error('Failed to update booking status');
        set((state) => ({ bookings: state.bookings.map((b) => b.id !== bookingId ? b : { ...b, status }) }));
        if (status === 'no_show') {
          const booking = get().bookings.find((b) => b.id === bookingId);
          if (booking?.memberId) {
            const member = get().members.find((m) => m.id === booking.memberId);
            if (member) {
              await get().updateMember(booking.memberId, { totalNoShows: member.totalNoShows + 1 }).catch(() => { toast.error('Could not update member stats, but the booking was saved.'); });
            }
          }
        }
      },

      cancelBooking: async (bookingId) => {
        console.debug('[store] cancelBooking', { bookingId });
        await get().updateBookingStatus(bookingId, 'cancelled');
      },

      rescheduleBooking: async (bookingId, date, startHour) => {
        console.debug('[store] rescheduleBooking', { bookingId, date, startHour });
        const success = await apiRescheduleBooking(bookingId, date, startHour);
        if (!success) throw new Error('Failed to reschedule booking');
        set((state) => ({ bookings: state.bookings.map((b) => b.id === bookingId ? { ...b, date, startHour } : b) }));
      },

      addMember: async (memberData) => {
        console.debug('[store] addMember', { firstName: memberData.firstName, lastName: memberData.lastName });
        const result = await apiAddMember({
          tenantId: memberData.tenantId,
          firstName: memberData.firstName,
          lastName: memberData.lastName,
          phone: memberData.phone,
          email: memberData.email,
          tier: memberData.tier,
        });
        if (!result) throw new Error('Failed to add member');
        set((state) => ({ members: [...state.members, result] }));
        return result.id;
      },

      updateMember: async (memberId, updates) => {
        console.debug('[store] updateMember', { memberId });
        const success = await apiUpdateMember(memberId, updates);
        if (!success) throw new Error('Failed to update member');
        set((state) => ({ members: state.members.map((m) => m.id === memberId ? { ...m, ...updates } : m) }));
      },

      addCourt: async (courtData) => {
        console.debug('[store] addCourt', { name: courtData.name });
        const result = await apiAddCourt({ tenantId: courtData.tenantId, name: courtData.name, hourlyRate: courtData.hourlyRate });
        if (!result) throw new Error('Failed to add court');
        set((state) => ({ courts: [...state.courts, result], tenant: { ...state.tenant, courtCount: state.courts.length + 1 } }));
        return result.id;
      },

      updateCourt: async (courtId, updates) => {
        console.debug('[store] updateCourt', { courtId });
        const success = await apiUpdateCourt(courtId, updates);
        if (!success) throw new Error('Failed to update court');
        set((state) => ({ courts: state.courts.map((c) => c.id === courtId ? { ...c, ...updates } : c) }));
      },

      removeCourt: async (courtId) => {
        console.debug('[store] removeCourt', { courtId });
        const success = await apiRemoveCourt(courtId);
        if (!success) throw new Error('Failed to remove court');
        set((state) => ({ courts: state.courts.filter((c) => c.id !== courtId), tenant: { ...state.tenant, courtCount: state.courts.length - 1 } }));
      },

      addItem: async (itemData) => {
        console.debug('[store] addItem', { name: itemData.name });
        const result = await apiAddItem({ tenantId: itemData.tenantId, name: itemData.name, price: itemData.price, type: itemData.type });
        if (!result) throw new Error('Failed to add item');
        set((state) => ({ items: [...state.items, result] }));
        return result.id;
      },

      updateItem: async (itemId, updates) => {
        console.debug('[store] updateItem', { itemId });
        const success = await apiUpdateItem(itemId, updates);
        if (!success) throw new Error('Failed to update item');
        set((state) => ({ items: state.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }));
      },

      removeItem: async (itemId) => {
        console.debug('[store] removeItem', { itemId });
        const success = await apiRemoveItem(itemId);
        if (!success) throw new Error('Failed to remove item');
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
      },

      updateTenant: async (updates) => {
        console.debug('[store] updateTenant', updates);
        const tenantId = get().tenant.id;
        const success = await apiUpdateTenant(tenantId, updates);
        if (!success) throw new Error('Failed to update tenant');
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));
      },

      setOnline: (online) => set({ isOnline: online }),
      setPendingSync: (count) => set({ pendingSync: count }),
      setLastSynced: (ts) => set({ lastSyncedAt: ts }),

      hydrateFromRemote: (data) => {
        console.debug('[store] hydrateFromRemote', { tenant: data.tenant.name, users: data.users.length, courts: data.courts.length });
        set({ isOnboarded: true, tenant: data.tenant, users: data.users, courts: data.courts, items: data.items, members: data.members, bookings: data.bookings, lastSyncedAt: new Date().toISOString() });
      },

      refreshFromServer: async () => {
        const { currentUser, isOnboarded } = get();
        if (!currentUser || !isOnboarded || currentUser.role === 'system_admin') return;
        if (!currentUser.tenantId) return;

        console.debug('[store] refreshFromServer', { tenantId: currentUser.tenantId });
        const data = await apiHydrate(currentUser.tenantId);
        if (data) {
          get().hydrateFromRemote(data);
          console.debug('[store] refreshFromServer OK', { courts: data.courts.length });
        } else {
          console.warn('[store] refreshFromServer failed');
          toast.error('Could not sync latest data from the server. You may be viewing outdated information.');
        }
      },
    }),
    {
      name: 'court-books-store',
      storage: createJSONStorage(() => {
        if (isBrowser) return sessionStorage;
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        currentUser: state.currentUser,
        users: state.users,
        isOnboarded: state.isOnboarded,
        tenant: state.tenant,
        courts: state.courts,
        items: state.items,
        members: state.members,
        bookings: state.bookings,
        lastSyncedAt: state.lastSyncedAt,
      }),
      onRehydrateStorage: () => {
        return (state) => {
          if (!state) return;
          state._hasHydrated = true;
          state.refreshFromServer();
        };
      },
    }
  )
);
