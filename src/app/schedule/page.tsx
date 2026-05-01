'use client';

import { AppShell } from '@/components/app-shell';
import { useStore } from '@/store';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, getOperatingHours } from '@/lib/types';
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
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h} ${ampm}`;
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

  // Multi-cell selection state
  const [selection, setSelection] = useState<{ courtId: string; hours: number[] } | null>(null);

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

  const hours = useMemo(() => getOperatingHours(tenant), [tenant]);

  const dateBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.date === selectedDate && b.status !== 'cancelled'
      ),
    [bookings, selectedDate]
  );

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

    // Tapping a booked cell shows booking details
    if (booking) {
      setSelection(null);
      setSelectedBooking(booking);
      return;
    }

    // Different court — start fresh selection on this court
    if (!selection || selection.courtId !== courtId) {
      setSelection({ courtId, hours: [hour] });
      return;
    }

    // Same court — free toggle: add or remove the hour
    const { hours: selectedHours } = selection;

    if (selectedHours.includes(hour)) {
      const remaining = selectedHours.filter((h) => h !== hour);
      setSelection(remaining.length > 0 ? { courtId, hours: remaining } : null);
    } else {
      setSelection({ courtId, hours: [...selectedHours, hour] });
    }
  };

  const handleConfirmSelection = () => {
    if (!selection || selection.hours.length === 0) return;
    const sorted = [...selection.hours].sort((a, b) => a - b);
    const hoursParam = sorted.join(',');
    router.push(
      `/booking/new?court=${selection.courtId}&date=${selectedDate}&hours=${hoursParam}`
    );
  };

  const handleClearSelection = () => {
    setSelection(null);
  };

  const isSelected = (courtId: string, hour: number) =>
    selection?.courtId === courtId && selection.hours.includes(hour);

  const gridColCount = filteredCourts.length;

  return (
    <AppShell>
      <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-4 text-ink">
        Schedule
      </h1>

      {/* Week quick-select */}
      <div className="flex gap-1.5 mb-4">
        {thisWeekDays.map((day) => {
          const isActive = day.date === selectedDate;
          return (
            <button
              key={day.date}
              onClick={() => { setSelectedDate(day.date); setSelection(null); }}
              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-colors ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-ink border border-line/60 hover:border-primary/30'
              }`}
            >
              <span className="text-[11px] font-medium">{day.dayAbbr}</span>
              <span className="text-base font-bold leading-none mt-0.5">{day.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Controls row: date picker + court chips */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="date"
          value={selectedDate}
          min={todayStr}
          onChange={(e) => { setSelectedDate(e.target.value); setSelection(null); }}
          aria-label="Select date"
          className="bg-white rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <span className="font-display font-semibold text-lg tracking-tight text-ink">
          {formatSelectedDate(selectedDate)}
        </span>
        <div className="flex gap-1.5 ml-auto">
          {courtChips.map((chip) => {
            const isActive = chip.id === courtFilter;
            return (
              <button
                key={chip.id}
                onClick={() => setCourtFilter(chip.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-surface-3 text-ink-3 hover:bg-line'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time-by-court grid */}
      <div className="overflow-x-auto mb-4">
        <div className="bg-white rounded-xl shadow-card overflow-hidden border border-line-2 min-w-[320px]">
          {/* Grid header */}
          <div
            className="grid border-b border-line-2 bg-surface-2"
            style={{
              gridTemplateColumns: `72px repeat(${gridColCount}, 1fr)`,
            }}
          >
            <div className="p-2" />
            {filteredCourts.map((court) => (
              <div
                key={court.id}
                className="text-xs font-semibold text-ink-3 text-center p-2 border-l border-line-2"
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
                gridTemplateColumns: `72px repeat(${gridColCount}, 1fr)`,
              }}
            >
              <div className="text-xs text-ink-3 p-2 flex items-center font-medium">
                {formatHour(hour)}
              </div>

              {filteredCourts.map((court) => {
                const booking = bookingGrid[court.id]?.[hour];
                const isBooked = !!booking;
                const isRecurring = booking?.isRecurring ?? false;
                const isSel = isSelected(court.id, hour);

                let cellClass =
                  'border-l border-line-2 p-1.5 flex items-center justify-center cursor-pointer transition-colors min-h-[36px]';
                let content: React.ReactNode;

                if (isBooked && isRecurring) {
                  cellClass += ' bg-amber text-white';
                  content = <span className="text-xs font-semibold">Rec</span>;
                } else if (isBooked) {
                  cellClass += ' bg-primary text-white';
                  content = <span className="text-xs font-semibold">{getInitials(booking.memberName)}</span>;
                } else if (isSel) {
                  cellClass += ' bg-primary-soft ring-2 ring-primary ring-inset';
                  content = <span className="text-xs font-semibold text-primary">✓</span>;
                } else {
                  cellClass += ' bg-white text-ink-4 hover:bg-primary-faint';
                  content = <span className="text-xs">&mdash;</span>;
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
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span className="text-xs text-ink-3">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber" />
          <span className="text-xs text-ink-3">Recurring</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm border border-line bg-white" />
          <span className="text-xs text-ink-3">Open</span>
        </div>
      </div>

      {/* Selection action bar */}
      {selection && selection.hours.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink rounded-2xl shadow-dropdown px-5 py-3 flex items-center gap-4">
          <div className="text-white text-sm">
            <span className="font-display font-bold">{selection.hours.length}h</span>
            <span className="text-white/60 ml-1.5">
              {courts.find((c) => c.id === selection.courtId)?.name}
            </span>
          </div>
          <button
            onClick={handleConfirmSelection}
            className="bg-primary hover:bg-primary-deep text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            Book
          </button>
          <button
            onClick={handleClearSelection}
            className="text-white/50 hover:text-white text-xs font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* FAB — hidden when selection active */}
      {!selection && <Link
        href="/booking/new"
        aria-label="Create new booking"
        className="fixed bottom-20 lg:bottom-6 right-6 z-50 w-12 h-12 bg-primary hover:bg-primary-deep text-white rounded-full flex items-center justify-center shadow-dropdown active:scale-95 transition-all"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </Link>}

      {/* Booking detail sheet */}
      {selectedBooking && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center"
          onClick={() => setSelectedBooking(null)}
        >
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px]" />
          <div
            className="relative bg-white shadow-sheet rounded-t-2xl w-full max-w-lg p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-line rounded-full mx-auto mb-5" />
            <h3 className="font-display text-xl font-semibold mb-1 text-ink">
              {selectedBooking.memberName}
            </h3>
            <p className="text-xs text-ink-3 mb-4">
              {courts.find((c) => c.id === selectedBooking.courtId)?.name} &middot;{' '}
              {selectedBooking.startHour}:00 &middot;{' '}
              {selectedBooking.durationMinutes} min &middot;{' '}
              {selectedBooking.isRecurring ? 'Recurring' : 'One-time'}
            </p>
            <div className="bg-surface-2 rounded-xl p-3.5 mb-4">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-ink">Total</span>
                <span className="text-primary font-display">
                  ₱{selectedBooking.total.toLocaleString()}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedBooking(null)}
              className="w-full bg-primary hover:bg-primary-deep text-white py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}
