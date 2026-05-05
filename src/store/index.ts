import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createEncryptedStorage } from '@/lib/crypto-storage';
import { User, Tenant, Court, Item, Member, Booking, Sport, BookingStatus, UserRole, TimeRange } from '@/lib/types';
import {
  apiCreateBooking, apiUpdateBookingStatus, apiRescheduleBooking,
  apiAddMember, apiUpdateMember,
  apiAddCourt, apiUpdateCourt, apiRemoveCourt,
  apiAddItem, apiUpdateItem, apiRemoveItem,
  apiAddSport, apiUpdateSport, apiRemoveSport,
  apiUpdateTenant, apiCreateUser, apiHydrate, apiLogout,
} from '@/lib/api';
import { enqueue } from '@/lib/sync';
import { toast } from '@/components/toast';
import { isTenantFrozen } from '@/lib/subscription';

const OFFLINE_TOAST = 'Saved offline — will sync when back online.';

const EMPTY_TENANT: Tenant = {
  id: '', name: '', subdomain: '', courtCount: 0,
  operatingHoursStart: 6, operatingHoursEnd: 22, freeTrialDays: 7,
  subscriptionStatus: 'trial', planTier: null, trialEndsAt: null,
  currentPeriodEnd: null, adminOverride: false,
  paymentMode: 'full', downpaymentPerHour: 0, createdAt: '',
};

interface AppState {
  currentUser: User | null;
  users: User[];
  isOnline: boolean;
  pendingSync: number;
  lastSyncedAt: string | null;
  isOnboarded: boolean;
  tenant: Tenant;
  sports: Sport[];
  selectedSportId: string | null;
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];
  _hasHydrated: boolean;

  login: (username: string, password: string) => User | null;
  logout: () => Promise<void>;
  createUser: (data: { username: string; password: string; role: UserRole; displayName: string; email: string }) => Promise<string>;
  addSport: (data: { name: string; operatingHoursRanges: TimeRange[] }) => Promise<string>;
  updateSport: (sportId: string, updates: Partial<{ name: string; operatingHoursRanges: TimeRange[]; isActive: boolean }>) => Promise<void>;
  removeSport: (sportId: string) => Promise<void>;
  setSelectedSport: (sportId: string | null) => void;
  createBooking: (booking: Omit<Booking, 'id' | 'createdAt' | 'tenantId'>) => Promise<string>;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => Promise<void>;
  cancelBooking: (bookingId: string) => Promise<void>;
  rescheduleBooking: (bookingId: string, date: string, startHour: number) => Promise<void>;
  addMember: (member: { firstName: string; lastName: string; phone: string; email: string; tier: 'regular' | 'vip' }) => Promise<string>;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  addCourt: (court: { sportId: string; name: string; hourlyRate: number; isActive: boolean }) => Promise<string>;
  updateCourt: (courtId: string, updates: Partial<Court>) => Promise<void>;
  removeCourt: (courtId: string) => Promise<void>;
  addItem: (item: { sportId?: string; name: string; price: number; type: 'rental' | 'sale'; isActive: boolean }) => Promise<string>;
  updateItem: (itemId: string, updates: Partial<Item>) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  updateTenant: (updates: Partial<Tenant>) => Promise<void>;
  setOnline: (online: boolean) => void;
  setPendingSync: (count: number) => void;
  setLastSynced: (ts: string) => void;
  hydrateFromRemote: (data: {
    tenant: Tenant; users: User[]; sports: Sport[]; courts: Court[];
    items: Item[]; members: Member[]; bookings: Booking[];
  }) => void;
  refreshFromServer: () => Promise<void>;
}

const isBrowser = typeof window !== 'undefined';

/**
 * Returns true and shows a role-appropriate toast if the tenant is frozen.
 * Call at the top of every write action to block mutations on frozen accounts.
 */
function checkFreezeGuard(get: () => AppState): boolean {
  const { tenant, currentUser } = get();
  if (tenant.adminOverride) return false;

  const frozen = isTenantFrozen(tenant.subscriptionStatus, tenant.trialEndsAt, tenant.currentPeriodEnd);
  if (!frozen) return false;

  const isAdmin = currentUser?.role === 'tenant_admin' || currentUser?.role === 'system_admin';
  toast.error(
    isAdmin
      ? 'Your account is frozen — upgrade your plan to continue.'
      : 'Your account is frozen — contact your admin.',
  );
  return true;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null, users: [],
      isOnline: true, pendingSync: 0, lastSyncedAt: null,
      isOnboarded: false, tenant: EMPTY_TENANT,
      sports: [], selectedSportId: null,
      courts: [], items: [], members: [], bookings: [],
      _hasHydrated: false,

      login: (username, password) => {
        const user = get().users.find((u) => u.username === username && u.password === password && u.isActive);
        if (user) { set({ currentUser: user }); return user; }
        return null;
      },

      logout: async () => {
        await apiLogout();
        set({ currentUser: null, isOnboarded: false, users: [], tenant: EMPTY_TENANT, sports: [], selectedSportId: null, courts: [], items: [], members: [], bookings: [] });
      },

      createUser: async (data) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const result = await apiCreateUser(data);
        if (!result) throw new Error('Failed to create user');
        set((state) => ({ users: [...state.users, result] }));
        return result.id;
      },

      addSport: async (data) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const result = await apiAddSport(data);
        if (!result) throw new Error('Failed to add sport');
        set((state) => {
          const newSports = [...state.sports, result];
          const selectedSportId = newSports.length === 1 ? result.id : state.selectedSportId;
          return { sports: newSports, selectedSportId };
        });
        return result.id;
      },

      updateSport: async (sportId, updates) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const success = await apiUpdateSport(sportId, updates);
        if (!success) throw new Error('Failed to update sport');
        set((state) => ({ sports: state.sports.map((s) => s.id === sportId ? { ...s, ...updates } : s) }));
      },

      removeSport: async (sportId) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const courtsForSport = get().courts.filter((c) => c.sportId === sportId);
        if (courtsForSport.length > 0) throw new Error('Cannot remove sport with assigned courts');
        const success = await apiRemoveSport(sportId);
        if (!success) throw new Error('Failed to remove sport');
        set((state) => {
          const newSports = state.sports.filter((s) => s.id !== sportId);
          const selectedSportId = state.selectedSportId === sportId
            ? (newSports[0]?.id ?? null)
            : state.selectedSportId;
          return { sports: newSports, selectedSportId };
        });
      },

      setSelectedSport: (sportId) => set({ selectedSportId: sportId }),

      createBooking: async (bookingData) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { tenant, isOnline } = get();

        if (isOnline) {
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
        }

        const tempId = crypto.randomUUID();
        set((state) => ({
          bookings: [...state.bookings, { ...bookingData, id: tempId, tenantId: tenant.id, createdAt: new Date().toISOString() } as Booking],
          pendingSync: state.pendingSync + 1,
        }));
        await enqueue({ kind: 'createBooking', payload: { ...bookingData, tenantId: tenant.id } as Record<string, unknown> });
        toast.info(OFFLINE_TOAST);
        return tempId;
      },

      updateBookingStatus: async (bookingId, status) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiUpdateBookingStatus(bookingId, status);
          if (!success) throw new Error('Failed to update booking status');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'updateBookingStatus', payload: { bookingId, tenantId: tenant.id, status } });
          toast.info(OFFLINE_TOAST);
        }

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
        await get().updateBookingStatus(bookingId, 'cancelled');
      },

      rescheduleBooking: async (bookingId, date, startHour) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiRescheduleBooking(bookingId, date, startHour);
          if (!success) throw new Error('Failed to reschedule booking');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'rescheduleBooking', payload: { bookingId, tenantId: tenant.id, date, startHour } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ bookings: state.bookings.map((b) => b.id === bookingId ? { ...b, date, startHour } : b) }));
      },

      addMember: async (memberData) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const result = await apiAddMember(memberData);
          if (!result) throw new Error('Failed to add member');
          set((state) => ({ members: [...state.members, result] }));
          return result.id;
        }

        const tempId = crypto.randomUUID();
        const optimistic: Member = {
          id: tempId, tenantId: tenant.id, ...memberData,
          totalBookings: 0, totalNoShows: 0, lastVisit: null,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ members: [...state.members, optimistic], pendingSync: state.pendingSync + 1 }));
        await enqueue({ kind: 'addMember', payload: { tenantId: tenant.id, ...memberData } });
        toast.info(OFFLINE_TOAST);
        return tempId;
      },

      updateMember: async (memberId, updates) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiUpdateMember(memberId, updates);
          if (!success) throw new Error('Failed to update member');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'updateMember', payload: { memberId, tenantId: tenant.id, updates: updates as Record<string, unknown> } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ members: state.members.map((m) => m.id === memberId ? { ...m, ...updates } : m) }));
      },

      addCourt: async (courtData) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const result = await apiAddCourt({ sportId: courtData.sportId, name: courtData.name, hourlyRate: courtData.hourlyRate });
          if (!result) throw new Error('Failed to add court');
          set((state) => ({ courts: [...state.courts, result], tenant: { ...state.tenant, courtCount: state.courts.length + 1 } }));
          return result.id;
        }

        const tempId = crypto.randomUUID();
        const optimistic: Court = {
          id: tempId, tenantId: tenant.id, sportId: courtData.sportId,
          name: courtData.name, hourlyRate: courtData.hourlyRate, isActive: courtData.isActive,
        };
        set((state) => ({
          courts: [...state.courts, optimistic],
          tenant: { ...state.tenant, courtCount: state.courts.length + 1 },
          pendingSync: state.pendingSync + 1,
        }));
        await enqueue({ kind: 'addCourt', payload: { tenantId: tenant.id, sportId: courtData.sportId, name: courtData.name, hourlyRate: courtData.hourlyRate } });
        toast.info(OFFLINE_TOAST);
        return tempId;
      },

      updateCourt: async (courtId, updates) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiUpdateCourt(courtId, updates);
          if (!success) throw new Error('Failed to update court');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'updateCourt', payload: { courtId, tenantId: tenant.id, updates: updates as Record<string, unknown> } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ courts: state.courts.map((c) => c.id === courtId ? { ...c, ...updates } : c) }));
      },

      removeCourt: async (courtId) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiRemoveCourt(courtId);
          if (!success) throw new Error('Failed to remove court');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'removeCourt', payload: { courtId, tenantId: tenant.id } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ courts: state.courts.filter((c) => c.id !== courtId), tenant: { ...state.tenant, courtCount: state.courts.length - 1 } }));
      },

      addItem: async (itemData) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const result = await apiAddItem({ sportId: itemData.sportId, name: itemData.name, price: itemData.price, type: itemData.type });
          if (!result) throw new Error('Failed to add item');
          set((state) => ({ items: [...state.items, result] }));
          return result.id;
        }

        const tempId = crypto.randomUUID();
        const optimistic: Item = {
          id: tempId, tenantId: tenant.id, sportId: itemData.sportId ?? '',
          name: itemData.name, price: itemData.price, type: itemData.type, isActive: itemData.isActive,
        };
        set((state) => ({ items: [...state.items, optimistic], pendingSync: state.pendingSync + 1 }));
        await enqueue({ kind: 'addItem', payload: { tenantId: tenant.id, sportId: itemData.sportId, name: itemData.name, price: itemData.price, type: itemData.type } });
        toast.info(OFFLINE_TOAST);
        return tempId;
      },

      updateItem: async (itemId, updates) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiUpdateItem(itemId, updates);
          if (!success) throw new Error('Failed to update item');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'updateItem', payload: { itemId, tenantId: tenant.id, updates: updates as Record<string, unknown> } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ items: state.items.map((i) => i.id === itemId ? { ...i, ...updates } : i) }));
      },

      removeItem: async (itemId) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiRemoveItem(itemId);
          if (!success) throw new Error('Failed to remove item');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'removeItem', payload: { itemId, tenantId: tenant.id } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ items: state.items.filter((i) => i.id !== itemId) }));
      },

      updateTenant: async (updates) => {
        if (checkFreezeGuard(get)) throw new Error('Account is frozen');
        const { isOnline, tenant } = get();

        if (isOnline) {
          const success = await apiUpdateTenant(updates);
          if (!success) throw new Error('Failed to update tenant');
        } else {
          set((state) => ({ pendingSync: state.pendingSync + 1 }));
          await enqueue({ kind: 'updateTenant', payload: { tenantId: tenant.id, updates: updates as Record<string, unknown> } });
          toast.info(OFFLINE_TOAST);
        }

        set((state) => ({ tenant: { ...state.tenant, ...updates } }));
      },

      setOnline: (online) => set({ isOnline: online }),
      setPendingSync: (count) => set({ pendingSync: count }),
      setLastSynced: (ts) => set({ lastSyncedAt: ts }),

      hydrateFromRemote: (data) => {
        const sports = data.sports ?? [];
        const activeSports = sports.filter((s) => s.isActive);
        const currentSelected = get().selectedSportId;
        const selectedSportId = (currentSelected && activeSports.some((s) => s.id === currentSelected))
          ? currentSelected
          : (activeSports[0]?.id ?? null);
        set({ isOnboarded: true, tenant: data.tenant, users: data.users, sports, selectedSportId, courts: data.courts, items: data.items, members: data.members, bookings: data.bookings, lastSyncedAt: new Date().toISOString() });
      },

      refreshFromServer: async () => {
        const { currentUser, isOnboarded } = get();
        if (!currentUser || !isOnboarded || currentUser.role === 'system_admin') return;

        const data = await apiHydrate();
        if (data) {
          get().hydrateFromRemote(data);
        } else {
          console.warn('[store] refreshFromServer failed');
          toast.error('Could not sync latest data from the server. You may be viewing outdated information.');
        }
      },
    }),
    {
      name: 'korte-store',
      storage: createJSONStorage(() => {
        if (isBrowser) return createEncryptedStorage(sessionStorage);
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
        sports: state.sports,
        selectedSportId: state.selectedSportId,
        courts: state.courts,
        items: state.items,
        members: state.members,
        bookings: state.bookings,
        pendingSync: state.pendingSync,
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
