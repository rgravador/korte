import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Tenant, Court, Item, Member, Booking, BookingStatus, ItemType } from '@/lib/types';
import {
  seedTenant,
  seedCourts,
  seedItems,
  seedMembers,
  seedBookings,
} from '@/lib/mock-data';

interface AppState {
  isOnboarded: boolean;
  tenant: Tenant;
  courts: Court[];
  items: Item[];
  members: Member[];
  bookings: Booking[];

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
    subdomain: string;
    operatingHoursStart: number;
    operatingHoursEnd: number;
    courts: { name: string; hourlyRate: number }[];
    items: { name: string; price: number; type: ItemType }[];
  }) => void;

  // Utility
  resetData: () => void;
  resetToFresh: () => void;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isOnboarded: false,
      tenant: seedTenant,
      courts: seedCourts,
      items: seedItems,
      members: seedMembers,
      bookings: seedBookings,

      createBooking: (bookingData) => {
        const id = `booking-${generateId()}`;
        const booking: Booking = {
          ...bookingData,
          id,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ bookings: [...state.bookings, booking] }));

        // Update member stats if not walk-in
        if (bookingData.memberId) {
          const member = get().members.find((m) => m.id === bookingData.memberId);
          if (member) {
            get().updateMember(bookingData.memberId, {
              totalBookings: member.totalBookings + 1,
              lastVisit: bookingData.date,
            });
          }
        }

        return id;
      },

      updateBookingStatus: (bookingId, status) => {
        set((state) => ({
          bookings: state.bookings.map((b) => {
            if (b.id !== bookingId) return b;
            return { ...b, status };
          }),
        }));

        // If marking as no-show, update member stats
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
        return id;
      },

      updateMember: (memberId, updates) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === memberId ? { ...m, ...updates } : m
          ),
        }));
      },

      addCourt: (courtData) => {
        const id = `court-${generateId()}`;
        const court: Court = { ...courtData, id };
        set((state) => ({
          courts: [...state.courts, court],
          tenant: { ...state.tenant, courtCount: state.courts.length + 1 },
        }));
        return id;
      },

      updateCourt: (courtId, updates) => {
        set((state) => ({
          courts: state.courts.map((c) =>
            c.id === courtId ? { ...c, ...updates } : c
          ),
        }));
      },

      removeCourt: (courtId) => {
        set((state) => ({
          courts: state.courts.filter((c) => c.id !== courtId),
          tenant: { ...state.tenant, courtCount: state.courts.length - 1 },
        }));
      },

      addItem: (itemData) => {
        const id = `item-${generateId()}`;
        const item: Item = { ...itemData, id };
        set((state) => ({ items: [...state.items, item] }));
        return id;
      },

      updateItem: (itemId, updates) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.id === itemId ? { ...i, ...updates } : i
          ),
        }));
      },

      removeItem: (itemId) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== itemId),
        }));
      },

      updateTenant: (updates) => {
        set((state) => ({ tenant: { ...state.tenant, ...updates } }));
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
        set({
          isOnboarded: true,
          tenant,
          courts,
          items,
          members: [],
          bookings: [],
        });
      },

      resetData: () => {
        set({
          isOnboarded: true,
          tenant: seedTenant,
          courts: seedCourts,
          items: seedItems,
          members: seedMembers,
          bookings: seedBookings,
        });
      },

      resetToFresh: () => {
        set({
          isOnboarded: false,
          tenant: seedTenant,
          courts: [],
          items: [],
          members: [],
          bookings: [],
        });
      },
    }),
    {
      name: 'court-books-store',
    }
  )
);
