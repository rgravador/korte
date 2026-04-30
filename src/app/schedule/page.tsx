'use client';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { useStore } from '@/store';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking } from '@/lib/types';
import Link from 'next/link';

function formatSelectedDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'a' : 'p';
  return `${h}${ampm}`;
}

export default function SchedulePage() {
  const { bookings, courts, tenant } = useStore();
  const router = useRouter();

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const thisWeekDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        date: d.toISOString().split('T')[0],
        dayAbbr: d.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: d.getDate(),
      };
    });
  }, []);
  const [courtFilter, setCourtFilter] = useState<string>('all');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive),
    [courts]
  );

  const filteredCourts = useMemo(
    () =>
      courtFilter === 'all'
        ? activeCourts
        : activeCourts.filter((c) => c.id === courtFilter),
    [activeCourts, courtFilter]
  );

  const hours = useMemo(() => {
    const result: number[] = [];
    for (let h = tenant.operatingHoursStart; h < tenant.operatingHoursEnd; h++) {
      result.push(h);
    }
    return result;
  }, [tenant.operatingHoursStart, tenant.operatingHoursEnd]);

  const dateBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.date === selectedDate && b.status !== 'cancelled'
      ),
    [bookings, selectedDate]
  );

  // Build a lookup: courtId -> hour -> booking
  const bookingGrid = useMemo(() => {
    const grid: Record<string, Record<number, Booking>> = {};
    for (const court of activeCourts) {
      grid[court.id] = {};
    }
    for (const booking of dateBookings) {
      if (!grid[booking.courtId]) continue;
      const slotCount = Math.ceil(booking.durationMinutes / 60);
      for (let i = 0; i < slotCount; i++) {
        grid[booking.courtId][booking.startHour + i] = booking;
      }
    }
    return grid;
  }, [activeCourts, dateBookings]);

  const courtChips = useMemo(
    () => [
      { id: 'all', label: 'All' },
      ...activeCourts.map((c) => ({
        id: c.id,
        label: c.name.replace('Court ', 'C'),
      })),
    ],
    [activeCourts]
  );

  const handleCellTap = (courtId: string, hour: number) => {
    const booking = bookingGrid[courtId]?.[hour];
    if (booking) {
      setSelectedBooking(booking);
    } else {
      router.push(
        `/booking/new?court=${courtId}&date=${selectedDate}&hour=${hour}`
      );
    }
  };

  const gridColCount = filteredCourts.length;

  return (
    <div className="min-h-screen bg-surface-2 max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-24">
        <Header />

        <h1 className="font-sans font-light text-2xl tracking-tight mb-3">
          Schedule
        </h1>

        {/* This week quick-select */}
        <div className="flex gap-1 mb-2">
          {thisWeekDays.map((day) => {
            const isActive = day.date === selectedDate;
            return (
              <button
                key={day.date}
                onClick={() => setSelectedDate(day.date)}
                className={`flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-primary-faint text-ink'
                }`}
              >
                <span className="font-sans text-[11px]">{day.dayAbbr}</span>
                <span className="font-sans text-base leading-none mt-0.5">{day.dayNum}</span>
              </button>
            );
          })}
        </div>

        {/* Date picker + label */}
        <div className="flex items-center gap-3 mb-3">
          <input
            type="date"
            value={selectedDate}
            min={todayStr}
            onChange={(e) => setSelectedDate(e.target.value)}
            aria-label="Select date"
            className="w-1/2 shrink-0 bg-white rounded-xl px-3 py-2 text-sm font-sans border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <span className="font-sans text-lg tracking-tight text-ink truncate">
            {formatSelectedDate(selectedDate)}
          </span>
        </div>

        {/* Court filter chips */}
        <div className="flex gap-1.5 mb-3">
          {courtChips.map((chip) => {
            const isActive = chip.id === courtFilter;
            return (
              <button
                key={chip.id}
                onClick={() => setCourtFilter(chip.id)}
                className={`font-sans text-xs px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface-3 text-ink-3'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Time-by-court grid */}
        <div className="overflow-x-auto">
        <div className="bg-white rounded-[16px] shadow-card overflow-hidden border border-line-2">
          {/* Grid header */}
          <div
            className="grid border-b border-line-2"
            style={{
              gridTemplateColumns: `40px repeat(${gridColCount}, 1fr)`,
            }}
          >
            <div className="p-1.5" />
            {filteredCourts.map((court) => (
              <div
                key={court.id}
                className="font-sans text-xs text-ink-3 text-center p-1.5 border-l border-line-2"
              >
                {court.name.replace('Court ', 'C')}
              </div>
            ))}
          </div>

          {/* Grid rows */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="grid border-b border-line-2 last:border-b-0"
              style={{
                gridTemplateColumns: `40px repeat(${gridColCount}, 1fr)`,
              }}
            >
              {/* Hour label */}
              <div className="font-sans text-xs text-ink-3 p-1.5 flex items-center">
                {formatHour(hour)}
              </div>

              {/* Court cells */}
              {filteredCourts.map((court) => {
                const booking = bookingGrid[court.id]?.[hour];
                const isBooked = !!booking;
                const isRecurring = booking?.isRecurring ?? false;

                let cellClass =
                  'border-l border-line-2 p-1 flex items-center justify-center cursor-pointer transition-colors min-h-[32px]';
                let content: React.ReactNode;

                if (isBooked && isRecurring) {
                  cellClass += ' bg-amber text-white';
                  content = (
                    <span className="font-sans text-xs font-medium">
                      Rec
                    </span>
                  );
                } else if (isBooked) {
                  cellClass += ' bg-primary text-white';
                  content = (
                    <span className="font-sans text-xs font-medium">
                      {getInitials(booking.memberName)}
                    </span>
                  );
                } else {
                  cellClass += ' bg-white text-ink-4 hover:bg-surface-3';
                  content = (
                    <span className="font-sans text-xs">&mdash;</span>
                  );
                }

                return (
                  <button
                    key={court.id}
                    onClick={() => handleCellTap(court.id, hour)}
                    className={cellClass}
                  >
                    {content}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span className="font-sans text-xs text-ink-3">
              Booked
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-amber" />
            <span className="font-sans text-xs text-ink-3">
              Recurring
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-line bg-white" />
            <span className="font-sans text-xs text-ink-3">
              Open
            </span>
          </div>
        </div>
      </div>

      {/* FAB */}
      <Link
        href="/booking/new"
        aria-label="Create new booking"
        className="fixed bottom-20 right-4 z-50 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center shadow-card-hover active:scale-95 transition-transform max-w-lg"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="w-5 h-5"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>

      <BottomNav />

      {/* Booking detail modal */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white shadow-sheet rounded-t-2xl w-full max-w-lg p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
            <h3 className="font-sans text-xl font-light mb-1">
              {selectedBooking.memberName}
            </h3>
            <p className="font-sans text-xs text-ink-3 mb-3">
              {courts.find((c) => c.id === selectedBooking.courtId)?.name} ·{' '}
              {selectedBooking.startHour}:00 ·{' '}
              {selectedBooking.durationMinutes} min ·{' '}
              {selectedBooking.isRecurring ? 'Recurring' : 'One-time'}
            </p>
            <div className="bg-surface-3 rounded-[16px] p-3 mb-3">
              <div className="flex justify-between font-sans text-base">
                <span>Total</span>
                <span className="text-primary font-bold">
                  ₱{selectedBooking.total.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full bg-primary text-white py-3 rounded-xl font-sans text-xs font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
