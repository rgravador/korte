'use client';

import { Header } from '@/components/header';
import { BottomNav } from '@/components/bottom-nav';
import { StatusTag } from '@/components/status-tag';
import { useStore } from '@/store';
import { useMemo, useState } from 'react';
import { Member, MemberTier } from '@/lib/types';

const LAPSED_THRESHOLD_DAYS = 21;

type FilterChip = 'all' | 'regular' | 'vip' | 'lapsed';

function isLapsed(lastVisit: string | null): boolean {
  if (!lastVisit) return true;
  const visitDate = new Date(lastVisit);
  const now = new Date();
  const diffMs = now.getTime() - visitDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > LAPSED_THRESHOLD_DAYS;
}

function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return 'never';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'upcoming';
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 wk ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} wks ago`;
  if (diffDays < 60) return '1 mo ago';
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} mos ago`;
  return `${Math.floor(diffDays / 365)} yr ago`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function MemberDetailSheet({
  member,
  onClose,
}: {
  member: Member;
  onClose: () => void;
}) {
  const { bookings, courts } = useStore();

  const memberBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.memberId === member.id)
        .sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.startHour - a.startHour;
        }),
    [bookings, member.id]
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <div
        className="relative bg-paper rounded-t-2xl w-full max-w-lg p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />

        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-paper-2 border border-line flex items-center justify-center font-mono text-xs font-medium text-ink-2 shrink-0">
            {getInitials(member.firstName, member.lastName)}
          </div>
          <div className="flex-1">
            <h3 className="font-display text-xl font-light">
              {member.firstName} {member.lastName}
            </h3>
            <p className="font-mono text-[9px] text-ink-3 tracking-wider mt-0.5">
              {member.phone} · {member.email}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded-pill font-mono text-[8px] tracking-wider uppercase ${
              member.tier === 'vip'
                ? 'bg-accent-soft text-accent-deep'
                : 'bg-paper-2 text-ink-3'
            }`}
          >
            {member.tier}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-4">
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Bookings</div>
            <div className="font-display text-xl leading-none">{member.totalBookings}</div>
          </div>
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">No-shows</div>
            <div className="font-display text-xl leading-none">{member.totalNoShows}</div>
          </div>
          <div className="bg-paper-2 rounded-[10px] p-2.5">
            <div className="font-mono text-[8px] tracking-wider uppercase text-ink-3 mb-1">Last visit</div>
            <div className="font-display text-sm leading-none mt-1">
              {member.lastVisit ? formatRelativeDate(member.lastVisit) : 'Never'}
            </div>
          </div>
        </div>

        <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-1.5">
          Booking history
        </div>

        {memberBookings.length > 0 ? (
          <div className="mb-2">
            {memberBookings.map((booking) => {
              const court = courts.find((c) => c.id === booking.courtId);
              return (
                <div
                  key={booking.id}
                  className="flex items-center justify-between py-2 border-b border-line-2"
                >
                  <div>
                    <div className="font-medium text-xs text-ink">
                      {formatDate(booking.date)} · {formatHour(booking.startHour)}
                    </div>
                    <div className="font-mono text-[9px] text-ink-3 tracking-wide">
                      {court?.name} · {booking.durationMinutes} min
                    </div>
                  </div>
                  <StatusTag status={booking.status} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-ink-3 font-mono text-xs">
            No bookings yet
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium mt-2"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AddMemberSheet({
  onClose,
}: {
  onClose: () => void;
}) {
  const { addMember, tenant } = useStore();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tier, setTier] = useState<MemberTier>('regular');

  const isValid = firstName.trim() !== '' && lastName.trim() !== '';

  const handleSubmit = () => {
    if (!isValid) return;
    addMember({
      tenantId: tenant.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      tier,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30" />
      <div
        className="relative bg-paper rounded-t-2xl w-full max-w-lg p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-line rounded-full mx-auto mb-4" />
        <h3 className="font-display text-xl font-light mb-4">Add Member</h3>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="bg-paper-2 rounded-lg px-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-accent"
            />
            <input
              type="text"
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="bg-paper-2 rounded-lg px-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <input
            type="tel"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-paper-2 rounded-lg px-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-paper-2 rounded-lg px-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-2">Tier</div>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setTier('regular')}
            className={`px-4 py-1.5 rounded-pill font-mono text-[10px] tracking-wider uppercase transition-colors ${
              tier === 'regular'
                ? 'bg-ink text-paper'
                : 'bg-paper-2 text-ink-3'
            }`}
          >
            Regular
          </button>
          <button
            onClick={() => setTier('vip')}
            className={`px-4 py-1.5 rounded-pill font-mono text-[10px] tracking-wider uppercase transition-colors ${
              tier === 'vip'
                ? 'bg-ink text-paper'
                : 'bg-paper-2 text-ink-3'
            }`}
          >
            VIP
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-lg font-sans text-xs font-medium transition-colors ${
              isValid
                ? 'bg-ink text-paper'
                : 'bg-line text-ink-4 cursor-not-allowed'
            }`}
          >
            Add Member
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-line text-ink-3 py-3 rounded-lg font-sans text-xs font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MembersPage() {
  const { members } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddSheet, setShowAddSheet] = useState(false);

  const lapsedCount = useMemo(
    () => members.filter((m) => isLapsed(m.lastVisit)).length,
    [members]
  );
  const activeCount = members.length - lapsedCount;

  const filteredMembers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return members.filter((m) => {
      const matchesSearch =
        query === '' ||
        m.firstName.toLowerCase().includes(query) ||
        m.lastName.toLowerCase().includes(query) ||
        m.phone.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (activeFilter === 'regular') return m.tier === 'regular';
      if (activeFilter === 'vip') return m.tier === 'vip';
      if (activeFilter === 'lapsed') return isLapsed(m.lastVisit);
      return true;
    });
  }, [members, searchQuery, activeFilter]);

  const filterChips: { key: FilterChip; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'regular', label: 'Regular' },
    { key: 'vip', label: 'VIP' },
    { key: 'lapsed', label: 'Lapsed' },
  ];

  return (
    <div className="min-h-screen bg-cream max-w-lg mx-auto">
      <div className="px-5 pt-4 pb-20">
        <Header />

        <h1 className="font-display font-light text-2xl tracking-tight mb-1">Members</h1>
        <p className="font-mono text-[9px] tracking-wider uppercase text-ink-3 mb-4">
          {activeCount} active · {lapsedCount} lapsed
        </p>

        {/* Search bar */}
        <div className="relative mb-3">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search members"
            className="w-full bg-paper-2 rounded-lg pl-9 pr-3 py-2.5 font-sans text-xs text-ink placeholder:text-ink-4 outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Filter chips */}
        <div className="flex gap-1.5 mb-4">
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setActiveFilter(chip.key)}
              className={`px-3 py-1 rounded-pill font-mono text-[10px] tracking-wider uppercase transition-colors ${
                activeFilter === chip.key
                  ? 'bg-ink text-paper'
                  : 'bg-paper-2 text-ink-3'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Member rows */}
        <div>
          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedMember(member)}
              className="w-full grid grid-cols-[32px_1fr_auto] gap-2.5 items-center py-2.5 border-b border-line-2 text-left"
            >
              <div className="w-8 h-8 rounded-full bg-paper-2 border border-line flex items-center justify-center font-mono text-[10px] font-medium text-ink-2">
                {getInitials(member.firstName, member.lastName)}
              </div>
              <div>
                <div className="font-medium text-xs text-ink">
                  {member.firstName} {member.lastName}
                </div>
                <div className="font-mono text-[9px] text-ink-3 tracking-wide">
                  {member.totalBookings} visits · last {formatRelativeDate(member.lastVisit)}
                </div>
              </div>
              <div className="font-mono text-[9px] text-ink-3 text-right">
                {member.totalBookings} bookings
              </div>
            </button>
          ))}

          {filteredMembers.length === 0 && (
            <div className="text-center py-8 text-ink-3 font-mono text-xs">
              No members found
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowAddSheet(true)}
        aria-label="Add new member"
        className="fixed bottom-20 right-4 max-w-lg w-12 h-12 bg-ink text-paper rounded-full flex items-center justify-center shadow-lg z-40"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <BottomNav />

      {selectedMember && (
        <MemberDetailSheet
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {showAddSheet && (
        <AddMemberSheet onClose={() => setShowAddSheet(false)} />
      )}
    </div>
  );
}
