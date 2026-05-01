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

/** Fire an API call. Log errors but never block the UI. */
function fireAndForget(label: string, fn: () => Promise<unknown>) {
  console.debug('[store] %s -> sending to server', label);
  fn()
    .then(() => console.debug('[store] %s -> server OK', label))
    .catch((err) => console.error('[store] %s -> server FAILED:', label, err));
}

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
  createUser: (data: { username: string; password: string; role: UserRole; displayName: string; email: string }) => string;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => string;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  cancelBooking: (bookingId: string) => void;
  rescheduleBooking: (bookingId: string, date: string, startHour: number) => void;
  addMember: (member: Omit<Member, 'id' | 'createdAt' | 'totalBookings' | 'totalNoShows' | 'lastVisit'>) => string;
  updateMember: (memberId: string, updates: Partial<Member>) => void;
  addCourt: (court: Omit<Court, 'id'>) => string;
  updateCourt: (courtId: string, updates: Partial<Court>) => void;
  removeCourt: (courtId: string) => void;
  addItem: (item: Omit<Item, 'id'>) => string;
  updateItem: (itemId: string, updates: Partial<Item>) => void;
  removeItem: (itemId: string) => void;
  updateTenant: (updates: Partial<Tenant>) => void;
  setupTenant: (data: {
    name: string; ownerName: string; ownerEmail: string;
    ownerUsername: string; ownerPassword: string; subdomain: string;
    operatingHoursStart: number; operatingHoursEnd: number;
    courts: { name: string; hourlyRate: number }[];
    items: { name: string; price: number; type: ItemType }[];
  }) => void;
  setOnline: (online: boolean) => void;
  setPendingSync: (count: number) => void;
  setLastSynced: (ts: string) => void;
  hydrateFromRemote: (data: {
    tenant: Tenant; users: User[]; courts: Court[];
    items: Item[]; members: Member[]; bookings: Booking[];
  }) => void;
  refreshFromServer: () => Promise<void>;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

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

      createUser: (data) => {
        console.debug('[store] createUser', { username: data.username, role: data.role });
        const id = `user-${generateId()}`;
        const tenantId = get().tenant.id;
        const user: User = { id, tenantId, username: data.username, password: data.password, role: data.role, displayName: data.displayName, email: data.email, isActive: true, createdAt: new Date().toISOString() };
        set((state) => ({ users: [...state.users, user] }));
        fireAndForget('createUser', () => apiCreateUser({ tenantId, ...data }));
        return id;
      },

      createBooking: (bookingData) => {
        console.debug('[store] createBooking', { courtId: bookingData.courtId, date: bookingData.date, startHour: bookingData.startHour });
        const id = `booking-${generateId()}`;
        set((state) => ({ bookings: [...state.bookings, { ...bookingData, id, createdAt: new Date().toISOString() }] }));
        if (bookingData.memberId) {
          const member = get().members.find((m) => m.id === bookingData.memberId);
          if (member) get().updateMember(bookingData.memberId, { totalBookings: member.totalBookings + 1, lastVisit: bookingData.date });
        }
        fireAndForget('createBooking', () => apiCreateBooking(bookingData));
        return id;
      },

      updateBookingStatus: (bookingId, status) => {
        console.debug('[store] updateBookingStatus', { bookingId, status });
        set((state) => ({ bookings: state.bookings.map((b) => b.id !== bookingId ? b : { ...b, status }) }));
        if (status === 'no_show') {
          const booking = get().bookings.find((b) => b.id === bookingId);
          if (booking?.memberId) {
            const member = get().members.find((m) => m.id === booking.memberId);
            if (member) get().updateMember(booking.memberId, { totalNoShows: member.totalNoShows + 1 });
          }
        }
        fireAndForget('updateBookingStatus', () => apiUpdateBookingStatus(bookingId, status));
      },

      cancelBooking: (bookingId) => {
        console.debug('[store] cancelBooking', { bookingId });
        get().updateBookingStatus(bookingId, 'cancelled');
      },

      rescheduleBooking: (bookingId, date, startHour) => {
        console.debug('[store] rescheduleBooking', { bookingId, date, startHour });
        set((state) => ({ bookings: state.bookings.map((b) => b.id === bookingId ? { ...b, date, startHour } : b) }));
        fireAndForget('rescheduleBooking', () => apiRescheduleBooking(bookingId, date, startHour));
      },

      addMember: (memberData) => {
        console.debug('[store] addMember', { firstName: memberData.firstName, lastName: memberData.lastName });
        const id = `member-${generateId()}`;
        set((state) => ({ members: [...state.members, { ...memberData, id, totalBookings: 0, totalNoShows: 0, lastVisit: null, createdAt: new Date().toISOString() }] }));
        fireAndForget('addMember', () => apiAddMember({ tenantId: memberData.tenantId, firstName: memberData.firstName, lastName: memberData.lastName, phone: memberData.phone, email: memberData.email, tier: memberData.tier }));
        return id;
      },

      updateMember: (memberId, updates) => {
        console.debug('[store] updateMember', { memberId });
        set((state) => ({ members: state.members.map((m) => m.id === memberId ? { ...m, ...updates } : m) }));
        fireAndForget('updateMember', () => apiUpdateMember(memberId, updates));
      },

      addCourt: (courtData) => {
        console.debug('[store] addCourt', { name: courtData.name });
        const id = `court-${generateId()}`;
        set((state) => ({ courts: [...state.courts, { ...courtData, id }], tenant: { ...state.tenant, courtCount: state.courts.length + 1 } }));
        fireAndForget('addCourt', () => apiAddCourt({ tenantId: courtData.tenantId, name: courtData.name, hourlyRate: courtData.hourlyRate }));
        return id;
      },

      updateCourt: (courtId, updates) => {
        console.debug('[store] updateCourt', { courtId });
        set((state) => ({ courts: state.courts.map((c) => c.id === courtId ? { ...c, ...updates } : c) }));
        fireAndForget('updateCourt', () => apiUpdateCourt(courtId, updates));
      },

      removeCourt: (courtId) => {
        console.debug('[store] removeCourt', { courtId });
        set((state) => ({ courts: state.courts.filter((c) => c.id !== courtId), tenant: { ...state.tenant, courtCount: state.courts.length - 1 } }));
        fireAndForget('removeCourt', () => apiRemoveCourt(courtId));
      },

      addItem: (itemData) => {
        console.debug('[store] addItem', { name: itemData.name });
        const id = `item-${generateId()}`;
        set((state) => ({ items: [...state.items, { ...itemData, id }] }));
        fireAndForget('addItem', () => apiAddItem({ tenantId: itemData.tenantId, name: itemData.name, price: itemData.price, type: itemData.type }));
        return id;
      },

      updateItem: (itemId, updates) => {
        console.debug('[store] updateItem', { itemId });
        set((state) => ({ items: state.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }));
        fireAndForget('updateItem', () => apiUpdateItem(itemId, updates));
      },

      removeItem: (itemId) => {
        console.debug('[store] removeItem', { itemId });
        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
        fireAndForget('removeItem', () => apiRemoveItem(itemId));
      },

      updateTenant: (updates) => {
        console.debug('[store] updateTenant', updates);
        const tenantId = get().tenant.id;
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));
        fireAndForget('updateTenant', () => apiUpdateTenant(tenantId, updates));
      },

      setupTenant: (data) => {
        console.debug('[store] setupTenant (local fallback)', { name: data.name });
        const tenantId = `tenant-${generateId()}`;
        const tenant: Tenant = { id: tenantId, name: data.name, subdomain: data.subdomain, courtCount: data.courts.length, operatingHoursStart: data.operatingHoursStart, operatingHoursEnd: data.operatingHoursEnd, createdAt: new Date().toISOString() };
        const courts: Court[] = data.courts.map((c, i) => ({ id: `court-${generateId()}-${i}`, tenantId, name: c.name, hourlyRate: c.hourlyRate, isActive: true }));
        const items: Item[] = data.items.map((item, i) => ({ id: `item-${generateId()}-${i}`, tenantId, name: item.name, price: item.price, type: item.type, isActive: true }));
        const adminUser: User = { id: `user-${generateId()}`, tenantId, username: data.ownerUsername, password: data.ownerPassword, role: 'tenant_admin', displayName: data.ownerName, email: data.ownerEmail, isActive: true, createdAt: new Date().toISOString() };
        set({ isOnboarded: true, currentUser: adminUser, users: [adminUser], tenant, courts, items, members: [], bookings: [] });
      },

      setOnline: (online) => set({ isOnline: online }),
      setPendingSync: (count) => set({ pendingSync: count }),
      setLastSynced: (ts) => set({ lastSyncedAt: ts }),

      hydrateFromRemote: (data) => {
        console.debug('[store] hydrateFromRemote', { tenant: data.tenant.name, users: data.users.length, courts: data.courts.length });
        set({ isOnboarded: true, tenant: data.tenant, users: data.users, courts: data.courts, items: data.items, members: data.members, bookings: data.bookings, lastSyncedAt: new Date().toISOString() });
      },

      /** Re-fetch tenant data from the server (e.g., on page reload). */
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
          console.warn('[store] refreshFromServer failed — using cached data');
        }
      },
    }),
    {
      name: 'court-books-store',
      storage: createJSONStorage(() => {
        if (isBrowser) return sessionStorage;
        // SSR fallback — no-op storage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      // Only persist data fields, not transient state
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
          // Mark that persist hydration is done
          state._hasHydrated = true;

          // Background refresh from server to get fresh data
          state.refreshFromServer();
        };
      },
    }
  )
);
