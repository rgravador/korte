'use client';

import { AppShell } from '@/components/app-shell';
import { StatusTag } from '@/components/status-tag';
import { useStore } from '@/store';
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, BookingStatus, getOperatingHours } from '@/lib/types';
import { toast } from '@/components/toast';
import { SportFilter } from '@/components/sport-filter';

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  return `${h} ${hour < 12 ? 'AM' : 'PM'}`;
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
  const { tenant } = useStore();
  const court = courts.find((c) => c.id === booking.courtId);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const totalHours = booking.durationMinutes / 60;
  const isDownpayment = tenant.paymentMode === 'downpayment' && tenant.downpaymentPerHour > 0;
  const downpaymentAmount = isDownpayment ? tenant.downpaymentPerHour * totalHours : 0;
  const balanceDue = isDownpayment ? Math.max(0, booking.total - downpaymentAmount) : 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
      <div
        className="relative bg-surface shadow-sheet rounded-t-2xl lg:rounded-2xl w-full max-w-lg md:max-w-xl p-5 md:p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5 lg:hidden" />

        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-display text-lg md:text-xl font-semibold text-ink">{booking.memberName}</h3>
            <p className="text-base text-ink-3 mt-1">
              {court?.name} &middot; {formatHour(booking.startHour)} &middot; {booking.durationMinutes} min
            </p>
          </div>
          <StatusTag status={booking.status} />
        </div>

        {booking.items.length > 0 && (
          <div className="bg-surface-2 rounded-xl p-3.5 mb-4">
            <div className="text-base font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Add-on items</div>
            {booking.items.map((item, i) => (
              <div key={i} className="flex justify-between text-base py-1 text-ink-2">
                <span>{item.itemName} x{item.quantity}</span>
                <span>₱{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="flex justify-between text-base pt-2.5 mt-2 border-t border-line/60">
              <span className="text-ink-3">Court fee</span>
              <span className="text-ink-2">₱{booking.courtFee.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-base font-semibold mt-2.5 pt-2.5 border-t border-line/60">
              <span className="text-ink">Total</span>
              <span className="text-primary font-display">₱{booking.total.toLocaleString()}</span>
            </div>
          </div>
        )}

        {booking.items.length === 0 && (
          <div className="bg-surface-2 rounded-xl p-3.5 mb-4">
            <div className="flex justify-between text-base font-semibold">
              <span className="text-ink">Court fee</span>
              <span className="text-primary font-display">₱{booking.courtFee.toLocaleString()}</span>
            </div>
          </div>
        )}

        {isDownpayment ? (
          <div className="text-base text-ink-3 mb-4 space-y-0.5">
            <div>Downpayment collected: ₱{downpaymentAmount.toLocaleString()}</div>
            {balanceDue > 0 && <div className="text-warn">Balance to collect at check-in: ₱{balanceDue.toLocaleString()}</div>}
          </div>
        ) : (
          <p className="text-base text-signal-text mb-4">Payment collected</p>
        )}

        {!confirmingCancel && <div className="flex gap-2">
          {booking.status === 'pending' && (
            <button
              onClick={() => onStatusChange(booking.id, 'confirmed')}
              className="flex-1 bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-base font-semibold transition-colors"
            >
              Confirm
            </button>
          )}
          {['confirmed', 'pending'].includes(booking.status) && (
            <button
              onClick={() => onStatusChange(booking.id, 'checked_in')}
              className="flex-1 bg-signal hover:bg-signal/90 text-white py-3 rounded-xl text-base font-semibold transition-colors"
            >
              Check In
            </button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'no_show' && (
            <>
              <button
                onClick={() => onStatusChange(booking.id, 'no_show')}
                className="flex-1 bg-warn-soft text-warn py-3 rounded-xl text-base font-semibold hover:bg-warn/10 transition-colors"
              >
                No-show
              </button>
              <button
                onClick={() => setConfirmingCancel(true)}
                className="flex-1 border border-line text-ink-3 py-3 rounded-xl text-base font-medium hover:bg-surface-2 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>}

        {confirmingCancel && (
          <div className="mt-4 bg-warn/5 border border-warn/20 rounded-xl p-4">
            <div className="text-base font-semibold text-ink mb-1">Cancel this booking?</div>
            <p className="text-base text-ink-3 mb-3">
              This will cancel {booking.memberName}&apos;s booking for {court?.name} at {formatHour(booking.startHour)}.
              This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(booking.id, 'cancelled')}
                className="flex-1 bg-warn text-white py-3 rounded-xl text-base font-semibold transition-colors"
              >
                Yes, cancel booking
              </button>
              <button
                onClick={() => setConfirmingCancel(false)}
                className="flex-1 bg-surface-3 text-ink-2 py-3 rounded-xl text-base font-semibold hover:bg-surface-2 transition-colors"
              >
                Keep booking
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { bookings, courts, sports, selectedSportId, tenant, updateBookingStatus, isOnboarded, currentUser } = useStore();
  const router = useRouter();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!isOnboarded || !currentUser) {
      router.replace('/');
    }
  }, [isOnboarded, currentUser, router]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const dayDate = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

  const firstName = currentUser?.displayName.split(' ')[0] ?? '';

  const selectedSport = sports.find((s) => s.id === selectedSportId) ?? null;
  const sportCourtIds = useMemo(() => {
    if (!selectedSportId) return null; // no filter — all courts
    return new Set(courts.filter((c) => c.sportId === selectedSportId).map((c) => c.id));
  }, [courts, selectedSportId]);

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== 'cancelled' && (!sportCourtIds || sportCourtIds.has(b.courtId)))
        .sort((a, b) => a.startHour - b.startHour),
    [bookings, today, sportCourtIds]
  );

  const todayCount = todayBookings.length;
  const noShowCount = todayBookings.filter((b) => b.status === 'no_show').length;

  const activeSportCourts = courts.filter((c) => c.isActive && (!selectedSportId || c.sportId === selectedSportId));
  const totalSlots = activeSportCourts.length * getOperatingHours(selectedSport ?? tenant).length;
  const bookedSlots = todayBookings.reduce(
    (acc, b) => acc + Math.ceil(b.durationMinutes / 60),
    0
  );
  const utilization = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;

  const handleStatusChange = async (bookingId: string, status: BookingStatus) => {
    try {
      await updateBookingStatus(bookingId, status);
      setSelectedBooking(null);
    } catch {
      toast.error('Could not update booking. Please check your connection and try again.');
    }
  };

  return (
    <AppShell>
      <SportFilter />

      {/* Greeting */}
        <h1 className="font-display font-bold text-2xl md:text-3xl leading-tight tracking-tight mb-1 text-ink">
          Good morning,<br />
          <span className="text-primary font-display italic">{firstName}.</span>
        </h1>
        <p className="text-base md:text-sm text-ink-3 mb-5 md:mb-8">
          {dayName} {dayDate} &middot; {tenant.name}
        </p>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 mb-6 md:mb-8">
          {[
            { label: 'Today', value: todayCount },
            { label: 'No-shows', value: noShowCount },
            { label: 'Utilization', value: `${utilization}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-surface shadow-card rounded-xl p-3 md:p-4">
              <div className="text-xs md:text-xs font-medium text-ink-3 uppercase tracking-wider mb-1.5">{label}</div>
              <div className="font-display text-2xl md:text-3xl font-bold leading-none text-ink">{value}</div>
            </div>
          ))}
        </div>

        {/* Bookings list */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-base md:text-base font-semibold text-ink">Next up</h2>
          <span className="text-sm md:text-xs font-medium text-ink-4">{todayCount} bookings</span>
        </div>

        <div className="bg-surface rounded-xl shadow-card overflow-hidden">
          {todayBookings.map((booking, index) => {
            const court = courts.find((c) => c.id === booking.courtId);
            const hasItems = booking.items.length > 0;
            const isLast = index === todayBookings.length - 1;

            return (
              <button
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                aria-label={`${booking.memberName} at ${formatHour(booking.startHour)}, ${booking.status.replace('_', ' ')}`}
                className={`w-full grid grid-cols-[64px_1fr_auto] md:grid-cols-[80px_1fr_auto] gap-3 items-center py-3 md:py-3.5 px-3.5 md:px-4 text-left hover:bg-surface-2/50 transition-colors ${
                  !isLast ? 'border-b border-line-2' : ''
                }`}
              >
                <div>
                  <div className="font-display text-sm md:text-base font-semibold leading-tight text-ink">
                    {formatHour(booking.startHour)}
                  </div>
                  <div className="text-xs md:text-xs text-ink-4 mt-0.5">
                    {booking.durationMinutes}m
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-sm md:text-sm text-ink truncate">
                    {booking.memberName}
                  </div>
                  <div className="text-xs md:text-xs text-ink-3 truncate mt-0.5">
                    {court?.name}
                    {hasItems && ` · ${booking.items.map((i) => `${i.quantity} ${i.itemName.split(' ')[0].toLowerCase()}`).join(', ')}`}
                  </div>
                </div>
                <StatusTag status={booking.status} />
              </button>
            );
          })}

          {todayBookings.length === 0 && (
            <div className="text-center py-12 text-ink-4 text-base">
              No bookings today
            </div>
          )}
        </div>
      {selectedBooking && (
        <BookingDetailSheet
          booking={selectedBooking}
          courts={courts}
          onClose={() => setSelectedBooking(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </AppShell>
  );
}
