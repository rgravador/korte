'use client';

import { useStore } from '@/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function ConfirmedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { bookings, courts } = useStore();

  const bookingId = searchParams.get('id');
  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <div className="min-h-screen bg-cream max-w-lg mx-auto flex flex-col items-center justify-center px-5">
        <div className="font-mono text-xs text-ink-3 mb-4">Booking not found</div>
        <button
          onClick={() => router.push('/booking/new')}
          className="bg-ink text-paper py-3 px-6 rounded-card font-sans text-xs font-medium"
        >
          New Booking
        </button>
      </div>
    );
  }

  const court = courts.find((c) => c.id === booking.courtId);

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-10 pb-8 flex flex-col items-center">
        {/* Green checkmark */}
        <div className="w-16 h-16 rounded-full bg-signal/10 flex items-center justify-center mb-4">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path
              d="M10 16.5L14.5 21L22 12"
              stroke="#2D5A3F"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="font-display font-light text-2xl tracking-tight mb-1">Booking Confirmed</h1>
        <p className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-6">
          {booking.id}
        </p>

        {/* Booking details card */}
        <div className="w-full bg-paper rounded-card border border-line p-4 mb-4">
          <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-3">Details</div>

          <div className="space-y-1.5">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Court</span>
              <span className="text-ink">{court?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Date</span>
              <span className="text-ink">{formatDate(booking.date)}</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Time</span>
              <span className="text-ink">{formatHour(booking.startHour)}</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Duration</span>
              <span className="text-ink">{booking.durationMinutes} min</span>
            </div>
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Member</span>
              <span className="text-ink">{booking.memberName}</span>
            </div>
          </div>
        </div>

        {/* Items section */}
        {booking.items.length > 0 && (
          <div className="w-full bg-paper rounded-card border border-line p-4 mb-4">
            <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-3">Items</div>
            {booking.items.map((item, i) => (
              <div key={i} className="flex justify-between font-mono text-[10px] py-0.5">
                <span className="text-ink-3">{item.itemName} x{item.quantity}</span>
                <span className="text-ink">₱{(item.unitPrice * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="w-full bg-paper rounded-card border border-line p-4 mb-4">
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px]">
              <span className="text-ink-3">Court fee</span>
              <span className="text-ink">₱{booking.courtFee.toLocaleString()}</span>
            </div>
            {booking.itemsTotal > 0 && (
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-ink-3">Items total</span>
                <span className="text-ink">₱{booking.itemsTotal.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-base pt-2 border-t border-line mt-1">
              <span>Total</span>
              <span className="italic text-accent-deep font-medium">₱{booking.total.toLocaleString()}</span>
            </div>
          </div>
          <p className="font-mono text-[8px] text-ink-3 tracking-wider mt-2">Collect at counter</p>
        </div>

        {/* Action buttons */}
        <div className="w-full flex gap-2">
          <button
            onClick={() => router.push('/schedule')}
            className="flex-1 border border-line text-ink py-3 rounded-card font-sans text-xs font-medium hover:bg-paper-2 transition-colors"
          >
            View Schedule
          </button>
          <button
            onClick={() => router.push('/booking/new')}
            className="flex-1 bg-ink text-paper py-3 rounded-card font-sans text-xs font-medium hover:bg-ink-2 transition-colors"
          >
            New Booking
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BookingConfirmedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-cream max-w-lg mx-auto flex items-center justify-center">
          <div className="font-mono text-xs text-ink-3">Loading...</div>
        </div>
      }
    >
      <ConfirmedContent />
    </Suspense>
  );
}
