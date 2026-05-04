'use client';

import { useStore } from '@/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, Suspense } from 'react';
import { BookingItem, getOperatingHours } from '@/lib/types';
import { SportFilter } from '@/components/sport-filter';
import { toast } from '@/components/toast';

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

/** Group sorted hours into consecutive blocks: [10,11,14,15] → [[10,11],[14,15]] */
function groupConsecutive(hours: number[]): number[][] {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const groups: number[][] = [[sorted[0]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1];
    if (sorted[i] === last[last.length - 1] + 1) {
      last.push(sorted[i]);
    } else {
      groups.push([sorted[i]]);
    }
  }
  return groups;
}

function formatSelectedTimes(hours: number[]): string {
  const groups = groupConsecutive(hours);
  return groups
    .map((g) => {
      const start = formatHour(g[0]);
      const end = formatHour(g[g.length - 1] + 1);
      return g.length === 1 ? start : `${start} – ${end}`;
    })
    .join(', ');
}

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { courts, sports, selectedSportId, members, items, bookings, tenant, createBooking, addMember } = useStore();

  const today = new Date().toISOString().split('T')[0];

  const [selectedCourtId, setSelectedCourtId] = useState<string>(searchParams.get('court') ?? '');
  const [selectedDate, setSelectedDate] = useState<string>(searchParams.get('date') ?? today);

  // Parse initial selected hours from params
  // Supports: ?hours=6,9,10 (comma-separated) or legacy ?hour=6&duration=180
  const [selectedHours, setSelectedHours] = useState<number[]>(() => {
    const hoursParam = searchParams.get('hours');
    if (hoursParam) {
      return hoursParam.split(',').map(Number).filter((n) => !isNaN(n));
    }
    const h = searchParams.get('hour');
    const d = searchParams.get('duration');
    if (!h) return [];
    const startHour = Number(h);
    const duration = d ? Number(d) : 60;
    const count = duration / 60;
    const hours: number[] = [];
    for (let i = 0; i < count; i++) {
      hours.push(startHour + i);
    }
    return hours;
  });

  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInName, setWalkInName] = useState('');
  const [walkInPhone, setWalkInPhone] = useState('');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);

  const selectedSport = sports.find((s) => s.id === selectedSportId) ?? null;
  const activeCourts = courts.filter((c) => c.isActive && (!selectedSportId || c.sportId === selectedSportId));
  const activeItems = items.filter((i) => i.isActive && (!selectedSportId || i.sportId === selectedSportId));
  const selectedCourt = activeCourts.find((c) => c.id === selectedCourtId);
  const selectedMember = members.find((m) => m.id === selectedMemberId);

  const bookedHoursForCourtAndDate = useMemo(() => {
    if (!selectedCourtId || !selectedDate) return new Set<number>();
    const booked = bookings
      .filter(
        (b) =>
          b.courtId === selectedCourtId &&
          b.date === selectedDate &&
          !['cancelled', 'no_show'].includes(b.status)
      )
      .flatMap((b) => {
        const hours: number[] = [];
        const slotCount = Math.ceil(b.durationMinutes / 60);
        for (let i = 0; i < slotCount; i++) {
          hours.push(b.startHour + i);
        }
        return hours;
      });
    return new Set(booked);
  }, [bookings, selectedCourtId, selectedDate]);

  const operatingHours = useMemo(() => getOperatingHours(selectedSport ?? tenant), [selectedSport, tenant]);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return [];
    const q = memberSearch.toLowerCase();
    return members.filter(
      (m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
        m.phone.includes(q)
    );
  }, [members, memberSearch]);

  const itemsTotal = useMemo(() => {
    return activeItems.reduce((sum, item) => {
      const qty = itemQuantities[item.id] ?? 0;
      return sum + item.price * qty;
    }, 0);
  }, [activeItems, itemQuantities]);

  const totalHours = selectedHours.length;
  const courtFee = (selectedCourt?.hourlyRate ?? 0) * totalHours;
  const total = courtFee + itemsTotal;

  const memberDisplayName = isWalkIn
    ? walkInName.trim() || 'Walk-in'
    : selectedMember
      ? `${selectedMember.firstName} ${selectedMember.lastName}`
      : null;

  const canSubmit = selectedCourtId && selectedHours.length > 0 && (selectedMemberId || isWalkIn);

  const handleToggleHour = (hour: number) => {
    if (bookedHoursForCourtAndDate.has(hour)) return;
    setSelectedHours((prev) =>
      prev.includes(hour)
        ? prev.filter((h) => h !== hour)
        : [...prev, hour]
    );
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] ?? 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setIsWalkIn(false);
    setMemberSearch('');
  };

  const handleShowWalkInForm = () => {
    setShowWalkInForm(true);
    setMemberSearch('');
  };

  const handleConfirmWalkIn = () => {
    if (!walkInName.trim()) return;
    setIsWalkIn(true);
    setSelectedMemberId(null);
    setShowWalkInForm(false);
    setMemberSearch('');
  };

  const handleClearMember = () => {
    setSelectedMemberId(null);
    setIsWalkIn(false);
    setWalkInName('');
    setWalkInPhone('');
  };

  const [submitting, setSubmitting] = useState(false);

  const handleConfirmClick = () => {
    const validationErrors: string[] = [];

    if (!selectedCourtId) validationErrors.push('Select a court');
    if (selectedHours.length === 0) validationErrors.push('Select at least one time slot');
    if (!selectedMemberId && !isWalkIn) validationErrors.push('Select a member or walk-in');

    const hasConflict = selectedHours.some((h) => bookedHoursForCourtAndDate.has(h));
    if (hasConflict) {
      validationErrors.push('One or more selected time slots are already booked');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors([]);
    setShowPaymentPrompt(true);
  };

  const handleConfirmPayment = async () => {
    setShowPaymentPrompt(false);
    setSubmitting(true);

    const bookingItems: BookingItem[] = activeItems
      .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
      .map((item) => ({
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        unitPrice: item.price,
        quantity: itemQuantities[item.id],
      }));

    try {
      // If walk-in, create member first
      let memberId = selectedMemberId;
      let bookingMemberName = memberDisplayName ?? 'Walk-in';

      if (isWalkIn && walkInName.trim()) {
        const nameParts = walkInName.trim().split(/\s+/);
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        try {
          const newMemberId = await addMember({
            firstName,
            lastName,
            phone: walkInPhone.trim() || '',
            email: '',
            tier: 'regular',
          });
          memberId = newMemberId;
          bookingMemberName = walkInName.trim();
          toast.success(`${walkInName.trim()} added as a new member`);
        } catch {
          // Member creation failed — continue with booking as walk-in (no member ID)
          toast.info('Booking saved, but could not create member record.');
        }
      }

      const blocks = groupConsecutive(selectedHours);
      let lastId = '';

      for (const block of blocks) {
        const blockDuration = block.length * 60;
        const blockCourtFee = (selectedCourt?.hourlyRate ?? 0) * block.length;
        const isFirstBlock = block === blocks[0];

        lastId = await createBooking({
          courtId: selectedCourtId,
          memberId,
          memberName: bookingMemberName,
          date: selectedDate,
          startHour: block[0],
          durationMinutes: blockDuration,
          status: 'confirmed',
          courtFee: blockCourtFee,
          items: isFirstBlock ? bookingItems : [],
          itemsTotal: isFirstBlock ? itemsTotal : 0,
          total: blockCourtFee + (isFirstBlock ? itemsTotal : 0),
          isRecurring: false,
          notes: blocks.length > 1 ? `Part of multi-block booking (${totalHours}h total)` : '',
        });
      }

      router.push(`/booking/confirmed?id=${lastId}`);
    } catch (err) {
      console.error('[booking] confirm failed:', err);
      toast.error('Could not save booking. Please check your connection and try again.');
      setErrors(['Could not save booking. Please check your connection and try again.']);
      setSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="px-5 md:px-8 pt-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-3"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-ink">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="font-display font-bold text-xl tracking-tight text-ink">New Booking</h1>
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 mb-4">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-warn">{err}</p>
            ))}
          </div>
        )}

        <SportFilter />

        {/* A) Court Selection */}
        <div className="mb-6">
          <div className="text-xs font-medium text-ink-3 mb-2">Court</div>
          <div className="flex gap-2">
            {activeCourts.map((court) => {
              const isSelected = court.id === selectedCourtId;
              return (
                <button
                  key={court.id}
                  onClick={() => {
                    setSelectedCourtId(court.id);
                    setSelectedHours([]);
                  }}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-surface-3 text-ink hover:bg-line'
                  }`}
                >
                  <div className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-ink'}`}>
                    {court.name}
                  </div>
                  <div className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-ink-3'}`}>
                    ₱{court.hourlyRate}/hr
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* B) Date & Time Slots */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium text-ink-3">Date &amp; time slots</div>
            {selectedHours.length > 0 && (
              <button
                onClick={() => setSelectedHours([])}
                className="text-[10px] text-primary font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedHours([]);
            }}
            min={today}
            className="w-full bg-surface-3 rounded-xl px-3 py-2.5 text-xs text-ink border-none outline-none mb-3"
          />

          {selectedCourtId ? (
            <>
              <p className="text-[10px] text-ink-4 mb-2">Tap to select hours. Non-consecutive hours are fine.</p>
              <div className="grid grid-cols-4 gap-1.5">
                {operatingHours.map((hour) => {
                  const isBooked = bookedHoursForCourtAndDate.has(hour);
                  const isSel = selectedHours.includes(hour);

                  return (
                    <button
                      key={hour}
                      onClick={() => handleToggleHour(hour)}
                      disabled={isBooked}
                      className={`rounded-lg px-2 py-2.5 text-[11px] text-center font-medium transition-colors ${
                        isSel
                          ? 'bg-primary text-white'
                          : isBooked
                            ? 'bg-surface-3 text-ink-4 line-through cursor-not-allowed'
                            : 'bg-surface-3 text-ink hover:bg-primary-faint'
                      }`}
                    >
                      {formatHour(hour)}
                    </button>
                  );
                })}
              </div>

              {/* Selection summary badge */}
              {selectedHours.length > 0 && (
                <div className="mt-3 bg-primary-faint rounded-lg px-3 py-2 flex items-center justify-between">
                  <span className="text-xs text-primary font-medium">
                    {formatSelectedTimes(selectedHours)}
                  </span>
                  <span className="text-xs font-bold text-primary">
                    {totalHours} hr{totalHours > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-3">Select a court to see available times</p>
          )}
        </div>

        {/* C) Member Assignment */}
        <div className="mb-6">
          <div className="text-xs font-medium text-ink-3 mb-2">Member</div>

          {!selectedMemberId && !isWalkIn && !showWalkInForm && (
            <>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="flex-1 bg-surface-3 rounded-xl px-3 py-2.5 text-xs text-ink placeholder:text-ink-4 border-none outline-none"
                />
                <button
                  onClick={handleShowWalkInForm}
                  className="bg-surface-3 hover:bg-line rounded-xl px-3 py-2.5 text-xs text-ink-2 whitespace-nowrap transition-colors"
                >
                  Walk-in
                </button>
              </div>

              {filteredMembers.length > 0 && (
                <div className="bg-surface rounded-xl border border-line-2 overflow-hidden">
                  {filteredMembers.slice(0, 5).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className="w-full flex justify-between items-center px-3 py-2.5 border-b border-line-2 last:border-b-0 text-left hover:bg-surface-2 transition-colors"
                    >
                      <div>
                        <div className="text-xs font-medium text-ink">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="text-xs text-ink-3">{member.phone}</div>
                      </div>
                      {member.tier === 'vip' && (
                        <span className="text-xs text-primary-deep bg-primary-soft px-1.5 py-0.5 rounded-full">
                          VIP
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Walk-in form */}
          {showWalkInForm && !isWalkIn && (
            <div className="bg-surface-2 rounded-xl p-3.5 border border-line/60 space-y-2.5">
              <div className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider">Walk-in details</div>
              <input
                type="text"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                placeholder="Full name *"
                className="w-full bg-surface rounded-lg px-3 py-2.5 text-xs text-ink placeholder:text-ink-4 border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <input
                type="tel"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                placeholder="Phone number"
                className="w-full bg-surface rounded-lg px-3 py-2.5 text-xs text-ink placeholder:text-ink-4 border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmWalkIn}
                  disabled={!walkInName.trim()}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    walkInName.trim()
                      ? 'bg-primary text-white'
                      : 'bg-line text-ink-4 cursor-not-allowed'
                  }`}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowWalkInForm(false)}
                  className="flex-1 bg-surface-3 text-ink-3 py-2.5 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {(selectedMemberId || isWalkIn) && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-primary-soft rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-primary-deep">
                    {memberDisplayName}
                  </span>
                  {selectedMember?.tier === 'vip' && (
                    <span className="text-xs text-primary-deep bg-surface/60 px-1.5 py-0.5 rounded-full">
                      VIP
                    </span>
                  )}
                  {isWalkIn && (
                    <span className="text-[10px] text-primary-deep/60 bg-surface/40 px-1.5 py-0.5 rounded-full">
                      New
                    </span>
                  )}
                </div>
                {isWalkIn && walkInPhone && (
                  <div className="text-[10px] text-primary-deep/70 mt-0.5">{walkInPhone}</div>
                )}
              </div>
              <button
                onClick={handleClearMember}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-3 hover:bg-line transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-3">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* D) Add Items */}
        <div className="mb-6">
          <div className="text-xs font-medium text-ink-3 mb-2">Add items</div>
          <div className="bg-surface rounded-xl border border-line-2 overflow-hidden">
            {activeItems.map((item, idx) => {
              const qty = itemQuantities[item.id] ?? 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between px-3 py-2.5 ${
                    idx < activeItems.length - 1 ? 'border-b border-line-2' : ''
                  }`}
                >
                  <div className="flex-1">
                    <div className="text-xs font-medium text-ink">{item.name}</div>
                    <div className="text-xs text-ink-3">
                      ₱{item.price.toLocaleString()} &middot; {item.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      disabled={qty === 0}
                      className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors ${
                        qty === 0
                          ? 'bg-surface-3 text-ink-4 cursor-not-allowed'
                          : 'bg-surface-3 text-ink hover:bg-line'
                      }`}
                    >
                      -
                    </button>
                    <span className="text-xs text-ink w-5 text-center">{qty}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-3 text-ink hover:bg-line text-sm transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* E) Booking Summary */}
        {selectedCourt && selectedHours.length > 0 && (
          <div className="bg-surface-2 rounded-xl p-4 mb-6 border border-line/60">
            <div className="text-[10px] font-semibold text-ink-3 uppercase tracking-wider mb-3">Summary</div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Court</span>
                <span className="text-ink font-medium">{selectedCourt.name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Date</span>
                <span className="text-ink font-medium">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between text-xs items-start">
                <span className="text-ink-3">Time</span>
                <span className="text-ink font-medium text-right max-w-[60%]">
                  {formatSelectedTimes(selectedHours)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Total hours</span>
                <span className="text-ink font-medium">{totalHours} hr{totalHours > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Member</span>
                <span className="text-ink font-medium">{memberDisplayName ?? '—'}</span>
              </div>
            </div>

            {/* Items breakdown */}
            {activeItems.some((item) => (itemQuantities[item.id] ?? 0) > 0) && (
              <div className="border-t border-line/60 pt-2.5 mb-2.5">
                {activeItems
                  .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
                  .map((item) => {
                    const qty = itemQuantities[item.id];
                    return (
                      <div key={item.id} className="flex justify-between text-xs py-0.5">
                        <span className="text-ink-3">{item.name} x{qty}</span>
                        <span className="text-ink">₱{(item.price * qty).toLocaleString()}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="border-t border-line/60 pt-2.5 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-ink-3">Court fee ({totalHours}h × ₱{selectedCourt.hourlyRate})</span>
                <span className="text-ink">₱{courtFee.toLocaleString()}</span>
              </div>
              {itemsTotal > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-ink-3">Items total</span>
                  <span className="text-ink">₱{itemsTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line/60 mt-1">
                <span className="text-ink">Total</span>
                <span className="text-primary font-display">₱{total.toLocaleString()}</span>
              </div>
              {tenant.paymentMode === 'downpayment' && tenant.downpaymentPerHour > 0 && (
                <>
                  <div className="flex justify-between text-xs pt-1.5">
                    <span className="text-ink-3">Downpayment ({totalHours}h × ₱{tenant.downpaymentPerHour})</span>
                    <span className="text-ink font-medium">₱{(tenant.downpaymentPerHour * totalHours).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-ink-3">Balance due at check-in</span>
                    <span className="text-ink font-medium">₱{Math.max(0, total - tenant.downpaymentPerHour * totalHours).toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Payment Confirmation Modal */}
        {showPaymentPrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-5" onClick={() => setShowPaymentPrompt(false)}>
            <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" />
            <div
              className="relative bg-surface rounded-2xl shadow-sheet w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                    <path d="M6 15h4" />
                  </svg>
                </div>
              </div>

              <h3 className="text-center font-display font-semibold text-lg text-ink mb-1">
                {tenant.paymentMode === 'downpayment' && tenant.downpaymentPerHour > 0
                  ? 'Collect Downpayment'
                  : 'Collect Payment'}
              </h3>
              <p className="text-center text-xs text-ink-3 mb-5">
                {tenant.paymentMode === 'downpayment' && tenant.downpaymentPerHour > 0
                  ? 'Please collect the downpayment from the customer before confirming.'
                  : 'Please collect the full amount from the customer before confirming.'}
              </p>

              <div className="bg-surface-2 rounded-xl p-4 mb-5 space-y-2">
                {tenant.paymentMode === 'downpayment' && tenant.downpaymentPerHour > 0 ? (
                  <>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-3">Total booking</span>
                      <span className="text-ink">₱{total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold pt-2 border-t border-line/60">
                      <span className="text-ink">Collect now</span>
                      <span className="text-primary font-display">₱{(tenant.downpaymentPerHour * totalHours).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-ink-3">Balance at check-in</span>
                      <span className="text-ink">₱{Math.max(0, total - tenant.downpaymentPerHour * totalHours).toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm font-semibold">
                    <span className="text-ink">Collect now</span>
                    <span className="text-primary font-display">₱{total.toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleConfirmPayment}
                  className="w-full bg-primary hover:bg-primary-deep text-white py-3.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  Payment collected
                </button>
                <button
                  onClick={() => setShowPaymentPrompt(false)}
                  className="w-full text-ink-3 py-2 text-xs font-medium"
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* F) Confirm Button */}
        <button
          onClick={handleConfirmClick}
          disabled={!canSubmit || submitting || showPaymentPrompt}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors ${
            canSubmit && !submitting
              ? 'bg-primary text-white hover:bg-primary-deep'
              : 'bg-line text-ink-4 cursor-not-allowed'
          }`}
        >
          {submitting
            ? 'Saving...'
            : selectedHours.length > 1
              ? `Confirm Booking (${totalHours} hrs)`
              : 'Confirm Booking'}
        </button>
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="app-shell flex items-center justify-center">
          <div className="text-xs text-ink-3">Loading...</div>
        </div>
      }
    >
      <NewBookingForm />
    </Suspense>
  );
}
