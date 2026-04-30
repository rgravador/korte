'use client';

import { useStore } from '@/store';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState, Suspense } from 'react';
import { BookingItem } from '@/lib/types';

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

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { courts, members, items, bookings, tenant, createBooking } = useStore();

  const today = new Date().toISOString().split('T')[0];

  const [selectedCourtId, setSelectedCourtId] = useState<string>(searchParams.get('court') ?? '');
  const [selectedDate, setSelectedDate] = useState<string>(searchParams.get('date') ?? today);
  const [selectedHour, setSelectedHour] = useState<number | null>(() => {
    const h = searchParams.get('hour');
    return h ? Number(h) : null;
  });
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<string[]>([]);

  const activeCourts = courts.filter((c) => c.isActive);
  const activeItems = items.filter((i) => i.isActive);
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

  const operatingHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = tenant.operatingHoursStart; h < tenant.operatingHoursEnd; h++) {
      hours.push(h);
    }
    return hours;
  }, [tenant.operatingHoursStart, tenant.operatingHoursEnd]);

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

  const courtFee = selectedCourt?.hourlyRate ?? 0;
  const total = courtFee + itemsTotal;

  const memberDisplayName = isWalkIn
    ? 'Walk-in'
    : selectedMember
      ? `${selectedMember.firstName} ${selectedMember.lastName}`
      : null;

  const canSubmit = selectedCourtId && selectedHour !== null && (selectedMemberId || isWalkIn);

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

  const handleWalkIn = () => {
    setIsWalkIn(true);
    setSelectedMemberId(null);
    setMemberSearch('');
  };

  const handleClearMember = () => {
    setSelectedMemberId(null);
    setIsWalkIn(false);
  };

  const handleConfirm = () => {
    const validationErrors: string[] = [];

    if (!selectedCourtId) validationErrors.push('Select a court');
    if (selectedHour === null) validationErrors.push('Select a time slot');
    if (!selectedMemberId && !isWalkIn) validationErrors.push('Select a member or walk-in');

    if (selectedHour !== null && bookedHoursForCourtAndDate.has(selectedHour)) {
      validationErrors.push('This time slot is already booked');
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    const bookingItems: BookingItem[] = activeItems
      .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
      .map((item) => ({
        itemId: item.id,
        itemName: item.name,
        itemType: item.type,
        unitPrice: item.price,
        quantity: itemQuantities[item.id],
      }));

    const newId = createBooking({
      tenantId: tenant.id,
      courtId: selectedCourtId,
      memberId: selectedMemberId,
      memberName: memberDisplayName ?? 'Walk-in',
      date: selectedDate,
      startHour: selectedHour!,
      durationMinutes: 60,
      status: 'confirmed',
      courtFee,
      items: bookingItems,
      itemsTotal,
      total,
      isRecurring: false,
      notes: '',
    });

    router.push(`/booking/confirmed?id=${newId}`);
  };

  return (
    <div className="min-h-screen bg-surface-2 max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-8">
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
          <h1 className="font-sans font-light text-xl tracking-tight">New Booking</h1>
        </div>

        {/* Validation errors */}
        {errors.length > 0 && (
          <div className="bg-warn/10 border border-warn/30 rounded-[16px] p-3 mb-4">
            {errors.map((err, i) => (
              <p key={i} className="font-sans text-xs text-warn">{err}</p>
            ))}
          </div>
        )}

        {/* A) Court Selection */}
        <div className="mb-5">
          <div className="font-sans text-xs text-ink-3 mb-2">Court</div>
          <div className="flex gap-2">
            {activeCourts.map((court) => {
              const isSelected = court.id === selectedCourtId;
              return (
                <button
                  key={court.id}
                  onClick={() => {
                    setSelectedCourtId(court.id);
                    setSelectedHour(null);
                  }}
                  className={`flex-1 rounded-[16px] px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? 'bg-primary text-white'
                      : 'bg-surface-3 text-ink hover:bg-surface-3'
                  }`}
                >
                  <div className={`font-sans text-xs font-medium ${isSelected ? 'text-white' : 'text-ink'}`}>
                    {court.name}
                  </div>
                  <div className={`font-sans text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-ink-3'}`}>
                    ₱{court.hourlyRate}/hr
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* B) Date & Time */}
        <div className="mb-5">
          <div className="font-sans text-xs text-ink-3 mb-2">Date & time</div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setSelectedHour(null);
            }}
            min={today}
            className="w-full bg-surface-3 rounded-[16px] px-3 py-2.5 font-sans text-xs text-ink border-none outline-none mb-3"
          />

          {selectedCourtId && (
            <div className="grid grid-cols-4 gap-1.5">
              {operatingHours.map((hour) => {
                const isBooked = bookedHoursForCourtAndDate.has(hour);
                const isSelected = hour === selectedHour;
                return (
                  <button
                    key={hour}
                    onClick={() => !isBooked && setSelectedHour(hour)}
                    disabled={isBooked}
                    className={`rounded-lg px-2 py-2 font-sans text-[11px] text-center transition-colors ${
                      isSelected
                        ? 'bg-primary text-white'
                        : isBooked
                          ? 'bg-surface-3 text-ink-4 line-through cursor-not-allowed'
                          : 'bg-surface-3 text-ink hover:bg-surface-3'
                    }`}
                  >
                    {formatHour(hour)}
                  </button>
                );
              })}
            </div>
          )}

          {!selectedCourtId && (
            <p className="font-sans text-xs text-ink-3">Select a court to see available times</p>
          )}
        </div>

        {/* C) Member Assignment */}
        <div className="mb-5">
          <div className="font-sans text-xs text-ink-3 mb-2">Member</div>

          {!selectedMemberId && !isWalkIn && (
            <>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search by name or phone..."
                  className="flex-1 bg-surface-3 rounded-[16px] px-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 border-none outline-none"
                />
                <button
                  onClick={handleWalkIn}
                  className="bg-surface-3 hover:bg-surface-3 rounded-[16px] px-3 py-2.5 font-sans text-xs text-ink-2 whitespace-nowrap transition-colors"
                >
                  Walk-in
                </button>
              </div>

              {filteredMembers.length > 0 && (
                <div className="bg-white rounded-[16px] border border-line-2 overflow-hidden">
                  {filteredMembers.slice(0, 5).map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className="w-full flex justify-between items-center px-3 py-2.5 border-b border-line-2 last:border-b-0 text-left hover:bg-surface-3 transition-colors"
                    >
                      <div>
                        <div className="font-sans text-xs font-medium text-ink">
                          {member.firstName} {member.lastName}
                        </div>
                        <div className="font-sans text-xs text-ink-3">{member.phone}</div>
                      </div>
                      {member.tier === 'vip' && (
                        <span className="font-sans text-xs text-primary-deep bg-primary-soft px-1.5 py-0.5 rounded-full">
                          VIP
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {(selectedMemberId || isWalkIn) && (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-primary-soft rounded-[16px] px-3 py-2.5 flex items-center gap-2">
                <span className="font-sans text-xs font-medium text-primary-deep">
                  {memberDisplayName}
                </span>
                {selectedMember?.tier === 'vip' && (
                  <span className="font-sans text-xs text-primary-deep bg-primary-soft px-1.5 py-0.5 rounded-full">
                    VIP
                  </span>
                )}
              </div>
              <button
                onClick={handleClearMember}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-3 hover:bg-surface-3 transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-3">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* D) Add Items */}
        <div className="mb-5">
          <div className="font-sans text-xs text-ink-3 mb-2">Add items</div>
          <div>
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
                    <div className="font-sans text-xs font-medium text-ink">{item.name}</div>
                    <div className="font-sans text-xs text-ink-3">
                      ₱{item.price.toLocaleString()} · {item.type}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      disabled={qty === 0}
                      className={`w-7 h-7 flex items-center justify-center rounded-full font-sans text-sm transition-colors ${
                        qty === 0
                          ? 'bg-surface-3 text-ink-4 cursor-not-allowed'
                          : 'bg-surface-3 text-ink hover:bg-surface-3'
                      }`}
                    >
                      -
                    </button>
                    <span className="font-sans text-xs text-ink w-5 text-center">{qty}</span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full bg-surface-3 text-ink hover:bg-surface-3 font-sans text-sm transition-colors"
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
        {selectedCourt && selectedHour !== null && (
          <div className="bg-surface-3 rounded-[16px] p-4 mb-5">
            <div className="font-sans text-xs text-ink-3 mb-3">Summary</div>

            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between font-sans text-xs">
                <span className="text-ink-3">Court</span>
                <span className="text-ink">{selectedCourt.name} · ₱{selectedCourt.hourlyRate}/hr</span>
              </div>
              <div className="flex justify-between font-sans text-xs">
                <span className="text-ink-3">Date</span>
                <span className="text-ink">{formatDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between font-sans text-xs">
                <span className="text-ink-3">Time</span>
                <span className="text-ink">{formatHour(selectedHour)}</span>
              </div>
              <div className="flex justify-between font-sans text-xs">
                <span className="text-ink-3">Member</span>
                <span className="text-ink">{memberDisplayName ?? '—'}</span>
              </div>
            </div>

            {/* Items breakdown */}
            {activeItems.some((item) => (itemQuantities[item.id] ?? 0) > 0) && (
              <div className="border-t border-line pt-2 mb-2">
                {activeItems
                  .filter((item) => (itemQuantities[item.id] ?? 0) > 0)
                  .map((item) => {
                    const qty = itemQuantities[item.id];
                    return (
                      <div key={item.id} className="flex justify-between font-sans text-xs py-0.5">
                        <span className="text-ink-3">{item.name} x{qty}</span>
                        <span className="text-ink">₱{(item.price * qty).toLocaleString()}</span>
                      </div>
                    );
                  })}
              </div>
            )}

            <div className="border-t border-line pt-2 space-y-1">
              <div className="flex justify-between font-sans text-xs">
                <span className="text-ink-3">Court fee</span>
                <span className="text-ink">₱{courtFee.toLocaleString()}</span>
              </div>
              {itemsTotal > 0 && (
                <div className="flex justify-between font-sans text-xs">
                  <span className="text-ink-3">Items total</span>
                  <span className="text-ink">₱{itemsTotal.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-sans text-base pt-1 border-t border-line mt-1">
                <span>Total</span>
                <span className="text-primary font-bold">₱{total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* F) Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!canSubmit}
          className={`w-full py-3.5 rounded-xl font-sans text-sm font-medium transition-colors ${
            canSubmit
              ? 'bg-primary text-white hover:bg-ink-2'
              : 'bg-line text-ink-4 cursor-not-allowed'
          }`}
        >
          Confirm Booking
        </button>
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-2 max-w-lg mx-auto flex items-center justify-center">
          <div className="font-sans text-xs text-ink-3">Loading...</div>
        </div>
      }
    >
      <NewBookingForm />
    </Suspense>
  );
}
