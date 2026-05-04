'use client';

import { AppShell } from '@/components/app-shell';
import { useStore } from '@/store';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Booking, getOperatingHours } from '@/lib/types';
import Link from 'next/link';
import { SportFilter } from '@/components/sport-filter';

// Distinct court colors — 10 colors that are visually separable on dark backgrounds
const COURT_COLORS = [
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', dot: 'bg-emerald-400', open: 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' },
  { bg: 'bg-sky-500/20', text: 'text-sky-400', border: 'border-sky-500/40', dot: 'bg-sky-400', open: 'bg-sky-500/15 text-sky-400 hover:bg-sky-500/25' },
  { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/40', dot: 'bg-violet-400', open: 'bg-violet-500/15 text-violet-400 hover:bg-violet-500/25' },
  { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40', dot: 'bg-rose-400', open: 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25' },
  { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', dot: 'bg-amber-400', open: 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' },
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', dot: 'bg-cyan-400', open: 'bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25' },
  { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/40', dot: 'bg-orange-400', open: 'bg-orange-500/15 text-orange-400 hover:bg-orange-500/25' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40', dot: 'bg-pink-400', open: 'bg-pink-500/15 text-pink-400 hover:bg-pink-500/25' },
  { bg: 'bg-lime-500/20', text: 'text-lime-400', border: 'border-lime-500/40', dot: 'bg-lime-400', open: 'bg-lime-500/15 text-lime-400 hover:bg-lime-500/25' },
  { bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/40', dot: 'bg-teal-400', open: 'bg-teal-500/15 text-teal-400 hover:bg-teal-500/25' },
];

function getCourtColor(index: number) {
  return COURT_COLORS[index % COURT_COLORS.length];
}

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
  const { bookings, courts, sports, selectedSportId, tenant } = useStore();
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

  // Filter courts by selected sport (if any)
  const selectedSport = useMemo(
    () => sports.find((s) => s.id === selectedSportId) ?? null,
    [sports, selectedSportId]
  );

  const activeCourts = useMemo(
    () => courts.filter((c) => c.isActive && (!selectedSportId || c.sportId === selectedSportId)),
    [courts, selectedSportId]
  );

  // Court colors scoped per sport (R10) — reset index for sport-filtered courts
  const courtColorMap = useMemo(() => {
    const map: Record<string, number> = {};
    activeCourts.forEach((c, i) => { map[c.id] = i; });
    return map;
  }, [activeCourts]);

  // On mobile (< md), show one court at a time when "All" is selected and there are 3+ courts
  const isMobileMultiCourt = courtFilter === 'all' && activeCourts.length >= 3;

  const filteredCourts = useMemo(
    () =>
      courtFilter === 'all'
        ? activeCourts
        : activeCourts.filter((c) => c.id === courtFilter),
    [activeCourts, courtFilter]
  );


  // Use selected sport's hours, or tenant fallback for single/no sport
  const hours = useMemo(
    () => getOperatingHours(selectedSport ?? tenant),
    [selectedSport, tenant]
  );

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

  // On desktop, always use filteredCourts. On mobile, use single court when in carousel mode.
  // Since we can't use media queries in JS, we render the grid with filteredCourts but
  // hide the overflow on mobile via CSS. Instead, use a simpler approach:
  // the mobile carousel replaces the grid entirely with a single-column list view.
  const gridColCount = filteredCourts.length;

  return (
    <AppShell>
      <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-4 text-ink">
        Schedule
      </h1>

      <SportFilter />

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
                  : 'bg-surface text-ink border border-line/60 hover:border-primary/30'
              }`}
            >
              <span className="text-[11px] font-medium">{day.dayAbbr}</span>
              <span className="text-base font-bold leading-none mt-0.5">{day.dayNum}</span>
            </button>
          );
        })}
      </div>

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input
          type="date"
          value={selectedDate}
          min={todayStr}
          onChange={(e) => { setSelectedDate(e.target.value); setSelection(null); }}
          aria-label="Select date"
          className="bg-surface rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <span className="font-display font-semibold text-lg tracking-tight text-ink">
          {formatSelectedDate(selectedDate)}
        </span>
      </div>

      {/* Court filter */}
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar mb-4">
        {courtChips.map((chip) => {
          const isActive = chip.id === courtFilter;
          return (
            <button
              key={chip.id}
              onClick={() => setCourtFilter(chip.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
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

      {/* Legend — court colors + status */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
        {activeCourts.map((court, i) => {
          const color = getCourtColor(i);
          return (
            <div key={court.id} className="flex items-center gap-1.5">
              <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
              <span className={`text-xs font-medium ${color.text}`}>{court.name}</span>
            </div>
          );
        })}
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-surface-3" />
          <span className="text-xs text-ink-4">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber/30" />
          <span className="text-xs text-ink-4">Recurring</span>
        </div>
      </div>

      {/* Mobile: time-first availability view (when many courts) */}
      {isMobileMultiCourt && (
        <div className="md:hidden mb-4 space-y-2">
          {hours.map((hour) => {
            const courtStatuses = activeCourts.map((court) => {
              const booking = bookingGrid[court.id]?.[hour];
              const isSel = isSelected(court.id, hour);
              return { court, booking, isSel };
            });
            const openCount = courtStatuses.filter((s) => !s.booking).length;

            return (
              <div key={hour} className="bg-surface rounded-xl border border-line-2 overflow-hidden">
                {/* Hour header */}
                <div className="flex items-center justify-between px-3.5 py-2 bg-surface-2">
                  <span className="text-sm font-semibold text-ink">{formatHour(hour)}</span>
                  <span className={`text-[10px] font-medium ${openCount > 0 ? 'text-signal' : 'text-ink-4'}`}>
                    {openCount > 0 ? `${openCount} open` : 'Full'}
                  </span>
                </div>
                {/* Court chips */}
                <div className="flex flex-wrap gap-1.5 px-3 py-2.5">
                  {courtStatuses.map(({ court, booking, isSel }) => {
                    const isBooked = !!booking;
                    const isRecurring = booking?.isRecurring ?? false;
                    const color = getCourtColor(courtColorMap[court.id] ?? 0);

                    return (
                      <button
                        key={court.id}
                        onClick={() => handleCellTap(court.id, hour)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${
                          isSel
                            ? `${color.bg} ring-1 ${color.border} ${color.text}`
                            : isBooked && isRecurring
                              ? 'bg-amber/20 text-amber'
                              : isBooked
                                ? 'bg-surface-3 text-ink-4 line-through'
                                : color.open
                        }`}
                      >
                        {court.name.replace('Court ', 'C')}
                        {isBooked && !isRecurring && (
                          <span className="ml-1 no-underline">{getInitials(booking.memberName)}</span>
                        )}
                        {isSel && <span className="ml-1">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop + mobile non-carousel: full court grid */}
      <div className={`overflow-x-auto mb-4 ${isMobileMultiCourt ? 'hidden md:block' : ''}`}>
        <div className="bg-surface rounded-xl shadow-card overflow-hidden border border-line-2">
          {/* Grid header */}
          <div
            className="grid border-b border-line-2 bg-surface-2"
            style={{
              gridTemplateColumns: `72px repeat(${gridColCount}, 1fr)`,
            }}
          >
            <div className="p-2" />
            {filteredCourts.map((court) => {
              const color = getCourtColor(courtColorMap[court.id] ?? 0);
              return (
                <div
                  key={court.id}
                  className="text-xs font-semibold text-center p-2 border-l border-line-2 flex items-center justify-center gap-1.5"
                >
                  <span className={`w-2 h-2 rounded-full ${color.dot}`} />
                  <span className={color.text}>{court.name.replace('Court ', 'C')}</span>
                </div>
              );
            })}
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
                const color = getCourtColor(courtColorMap[court.id] ?? 0);

                let cellClass =
                  'border-l border-line-2 p-1.5 flex items-center justify-center cursor-pointer transition-colors min-h-[36px]';
                let content: React.ReactNode;

                if (isBooked && isRecurring) {
                  cellClass += ' bg-amber/30 text-amber';
                  content = <span className="text-xs font-semibold">Rec</span>;
                } else if (isBooked) {
                  cellClass += ' bg-surface-3 text-ink-3';
                  content = <span className="text-xs font-semibold">{getInitials(booking.memberName)}</span>;
                } else if (isSel) {
                  cellClass += ` ${color.bg} ring-2 ${color.border} ring-inset`;
                  content = <span className={`text-xs font-semibold ${color.text}`}>✓</span>;
                } else {
                  cellClass += ` ${color.bg} hover:${color.bg}`;
                  content = <span className={`text-[10px] ${color.text} opacity-60`}>&bull;</span>;
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


      {/* Selection action bar */}
      {selection && selection.hours.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface rounded-2xl shadow-dropdown border border-line px-5 py-3 flex items-center gap-4">
          <div className="text-ink text-sm">
            <span className="font-display font-bold">{selection.hours.length}h</span>
            <span className="text-ink-3 ml-1.5">
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
            className="text-ink-3 hover:text-ink text-xs font-medium transition-colors"
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
            className="relative bg-surface shadow-sheet rounded-t-2xl w-full max-w-lg p-5 pb-8"
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
