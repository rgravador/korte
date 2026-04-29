'use client';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { StatusTag } from '@/components/status-tag';
import { useStore } from '@/store';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, BookingStatus } from '@/lib/types';

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

function BookingDetailSheet({
  booking,
  courts,
  onClose,
  onStatusChange,
}: {
  booking: Booking;
  courts: { id: string; name: string }[];
  onClose: () => void;
  onStatusChange: (id: string, status: BookingStatus) => void;
}) {
  const court = courts.find((c) => c.id === booking.courtId);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <div
        className="relative bg-paper rounded-t-2xl w-full max-w-lg p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-display text-xl font-light">{booking.memberName}</h3>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mt-1">
              {court?.name} · {formatHour(booking.startHour)} · {booking.durationMinutes} min
            </p>
          </div>
          <StatusTag status={booking.status} />
        </div>

        {booking.items.length > 0 && (
          <div className="bg-paper-2 rounded-card p-3 mb-3">
            <div className="font-mono text-[9px] text-ink-3 tracking-wider uppercase mb-2">Add-on Items</div>
            {booking.items.map((item, i) => (
              <div key={i} className="flex justify-between font-mono text-[10px] py-1">
                <span>{item.itemName} x{item.quantity}</span>
                <span>₱{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between font-mono text-[10px] pt-2 mt-1 border-t border-line">
              <span>Court fee</span>
              <span>₱{booking.courtFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-display text-base mt-1 pt-1 border-t border-line">
              <span>Total</span>
              <span className="italic text-accent-deep">₱{booking.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {booking.items.length === 0 && (
          <div className="bg-paper-2 rounded-card p-3 mb-3">
            <div className="flex justify-between font-display text-base">
              <span>Court fee</span>
              <span className="italic text-accent-deep">₱{booking.courtFee.toLocaleString()}</span>
            </div>
          </div>
        )}

        <p className="font-mono text-[8px] text-ink-3 tracking-wider mb-3">Collect payment at counter</p>

        <div className="flex gap-2">
          {booking.status === 'pending' && (
            <button
              onClick={() => onStatusChange(booking.id, 'confirmed')}
              className="flex-1 bg-ink text-paper py-3 rounded-lg font-sans text-xs font-medium"
            >
              Confirm
            </button>
          )}
          {['confirmed', 'pending'].includes(booking.status) && (
            <button
              onClick={() => onStatusChange(booking.id, 'checked_in')}
              className="flex-1 bg-signal text-paper py-3 rounded-lg font-sans text-xs font-medium"
            >
              Check In
            </button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'no_show' && (
            <>
              <button
                onClick={() => onStatusChange(booking.id, 'no_show')}
                className="flex-1 border border-warn text-warn py-3 rounded-lg font-sans text-xs font-medium"
              >
                No-show
              </button>
              <button
                onClick={() => onStatusChange(booking.id, 'cancelled')}
                className="flex-1 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { bookings, courts, tenant, updateBookingStatus, isOnboarded, currentUser } = useStore();
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!isOnboarded || !currentUser) {
      router.replace('/');
    }
  }, [isOnboarded, currentUser, router]);

  const today = new Date().toISOString().split('T')[0];
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const dayDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const firstName = currentUser?.displayName.split(' ')[0] ?? '';

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== 'cancelled')
        .sort((a, b) => a.startHour - b.startHour),
    [bookings, today]
  );

  const todayCount = todayBookings.length;
  const noShowCount = todayBookings.filter((b) => b.status === 'no_show').length;

  const totalSlots = courts.filter((c) => c.isActive).length *
    (tenant.operatingHoursEnd - tenant.operatingHoursStart);
  const bookedSlots = todayBookings.reduce(
    (acc, b) => acc + Math.ceil(b.durationMinutes / 60),
    0
  );
  const utilization = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  const handleStatusChange = (bookingId: string, status: BookingStatus) => {
    updateBookingStatus(bookingId, status);
    setSelectedBooking(null);
  };

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-20">
        <Header />

        <h1 className="font-display font-light text-2xl leading-tight tracking-tight mb-1">
          Good morning,<br />
          <em className="text-accent-deep">{firstName}.</em>
        </h1>
        <p className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-4">
          {dayName} {dayDate} · {tenant.name}
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Today</div>
            <div className="font-display text-xl leading-none">{todayCount}</div>
          </div>
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">No-shows</div>
            <div className="font-display text-xl leading-none">{noShowCount}</div>
          </div>
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Utiliz.</div>
            <div className="font-display text-xl leading-none">{utilization}%</div>
          </div>
        </div>

        {/* Bookings list */}
        <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-1.5">Next up</div>

        <div>
          {todayBookings.map((booking) => {
            const court = courts.find((c) => c.id === booking.courtId);
            const hasItems = booking.items.length > 0;

            return (
              <button
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className="w-full grid grid-cols-[44px_1fr_auto] gap-2.5 items-center py-2.5 border-b border-line-2 text-left"
              >
                <div>
                  <div className="font-mono text-[11px] leading-tight">
                    {booking.startHour}:00
                  </div>
                  <div className="font-mono text-[8px] text-ink-3">
                    {booking.durationMinutes} min
                  </div>
                </div>
                <div>
                  <div className="font-medium text-xs text-ink mb-px">
                    {booking.memberName}
                  </div>
                  <div className="font-mono text-[9px] text-ink-3 tracking-wide">
                    {court?.name} · Pickleball
                    {hasItems && ` · ${booking.items.map((i) => `${i.quantity} ${i.itemName.split(' ')[0].toLowerCase()}`).join(', ')}`}
                  </div>
                </div>
                <StatusTag status={booking.status} />
              </button>
            );
          })}

          {todayBookings.length === 0 && (
            <div className="text-center py-8 text-ink-3 font-mono text-xs">
              No bookings today
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          courts={courts}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
