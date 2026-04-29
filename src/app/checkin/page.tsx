'use client';

import { useStore } from '@/store';
import { StatusTag } from '@/components/status-tag';
import { useMemo, useState } from 'react';

import Link from 'next/link';

export default function CheckinPage() {
  const { bookings, courts, updateBookingStatus, currentUser } = useStore();
  const [filter, setFilter] = useState<'now' | 'earlier' | 'all'>('now');
  const [scanActive, setScanActive] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const currentHour = new Date().getHours();

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== 'cancelled')
        .sort((a, b) => a.startHour - b.startHour),
    [bookings, today]
  );

  const filteredBookings = useMemo(() => {
    if (filter === 'all') return todayBookings;
    if (filter === 'now') return todayBookings.filter((b) => b.startHour >= currentHour - 1 && b.startHour <= currentHour + 2);
    return todayBookings.filter((b) => b.startHour < currentHour);
  }, [todayBookings, filter, currentHour]);

  const expectedCount = todayBookings.length;

  const handleMockScan = () => {
    setScanActive(true);
    // Simulate finding the first pending/confirmed booking
    const scanTarget = todayBookings.find(
      (b) => b.status === 'confirmed' || b.status === 'pending'
    );
    setTimeout(() => {
      if (scanTarget) {
        updateBookingStatus(scanTarget.id, 'checked_in');
      }
      setScanActive(false);
    }, 1500);
  };

  const handleCheckIn = (bookingId: string) => {
    updateBookingStatus(bookingId, 'checked_in');
  };

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-20">
        {/* Staff header */}
        <div className="flex justify-between items-center mb-4">
          <div className="font-display font-normal italic text-lg tracking-tight">
            Court<span className="text-accent-deep not-italic">.</span>
          </div>
          <div className="font-mono text-[9px] text-ink-3 tracking-wider uppercase">
            Staff · {currentUser?.displayName.split(' ')[0] ?? 'Staff'}
          </div>
        </div>

        <h1 className="font-display font-light text-2xl tracking-tight mb-1">
          Check-<em className="text-accent-deep">in.</em>
        </h1>
        <p className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-4">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · {expectedCount} expected today
        </p>

        {/* QR Scanner frame */}
        <button
          onClick={handleMockScan}
          className="w-full aspect-square border-2 border-dashed border-ink rounded-2xl mb-3 relative flex items-center justify-center bg-paper-2"
        >
          {/* Corner marks */}
          <div className="absolute top-2 left-2 w-5 h-5 border-t-2 border-l-2 border-ink" />
          <div className="absolute top-2 right-2 w-5 h-5 border-t-2 border-r-2 border-ink" />
          <div className="absolute bottom-2 left-2 w-5 h-5 border-b-2 border-l-2 border-ink" />
          <div className="absolute bottom-2 right-2 w-5 h-5 border-b-2 border-r-2 border-ink" />

          <div className="font-mono text-[10px] text-ink-2 text-center">
            {scanActive ? (
              <span className="animate-pulse">Scanning...</span>
            ) : (
              <>Tap to scan QR<br />or pick from list below</>
            )}
          </div>
        </button>

        {/* Filter chips */}
        <div className="flex gap-1.5 mb-3">
          {(['now', 'earlier', 'all'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 border rounded-pill font-mono text-[9px] uppercase tracking-wider ${
                filter === f
                  ? 'bg-ink text-paper border-ink'
                  : 'border-line text-ink-2'
              }`}
            >
              {f === 'now' ? 'Now' : f === 'earlier' ? 'Earlier' : 'All today'}
            </button>
          ))}
        </div>

        {/* Booking list */}
        <div>
          {filteredBookings.map((booking) => {
            const court = courts.find((c) => c.id === booking.courtId);
            const hasItems = booking.items.length > 0;
            const canCheckIn = booking.status === 'confirmed' || booking.status === 'pending';

            return (
              <div
                key={booking.id}
                className="grid grid-cols-[44px_1fr_auto] gap-2.5 items-center py-2.5 border-b border-line-2"
              >
                <div>
                  <div className="font-mono text-[11px] leading-tight">
                    {booking.startHour}:00
                  </div>
                  <div className="font-mono text-[8px] text-ink-3">
                    {court?.name.replace('Court ', 'C')}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-xs text-ink mb-px">
                    {booking.memberName}
                  </div>
                  <div className="font-mono text-[9px] text-ink-3 tracking-wide">
                    Pickleball · {booking.durationMinutes} min
                    {hasItems && ` · ${booking.items.map((i) => `${i.quantity} ${i.itemName.split(' ')[0].toLowerCase()}`).join(', ')}`}
                  </div>
                </div>
                {canCheckIn ? (
                  <button
                    onClick={() => handleCheckIn(booking.id)}
                    className="font-mono text-[8px] tracking-wider uppercase px-2 py-1 rounded bg-signal text-paper"
                  >
                    Check in
                  </button>
                ) : (
                  <StatusTag status={booking.status} />
                )}
              </div>
            );
          })}

          {filteredBookings.length === 0 && (
            <div className="text-center py-8 text-ink-3 font-mono text-xs">
              No bookings in this window
            </div>
          )}
        </div>
      </div>

      {/* Staff bottom nav */}
      <nav aria-label="Staff navigation" className="fixed bottom-0 left-0 right-0 h-16 bg-paper border-t border-line grid grid-cols-4 items-center z-50 max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-0.5 text-ink relative">
          <span className="absolute top-0 w-7 h-0.5 bg-accent" />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
            <circle cx="12" cy="12" r="9" />
            <path d="m9 12 2 2 4-4" />
          </svg>
          <span className="font-mono text-[8px] tracking-wider uppercase">Check-in</span>
        </div>
        <Link href="/schedule" className="flex flex-col items-center gap-0.5 text-ink-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 10h18M8 2v4M16 2v4" />
          </svg>
          <span className="font-mono text-[8px] tracking-wider uppercase">Today</span>
        </Link>
        <Link href="/booking/new" className="flex flex-col items-center gap-0.5 text-ink-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
            <path d="M5 12h14M12 5v14" />
          </svg>
          <span className="font-mono text-[8px] tracking-wider uppercase">Walk-in</span>
        </Link>
        <Link href="/settings" className="flex flex-col items-center gap-0.5 text-ink-3">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
          </svg>
          <span className="font-mono text-[8px] tracking-wider uppercase">Account</span>
        </Link>
      </nav>
    </div>
  );
}
