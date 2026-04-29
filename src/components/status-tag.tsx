import { BookingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-accent-soft text-status-confirmed-text' },
  pending: { label: 'Pending', className: 'bg-status-pending-bg text-status-pending-text' },
  checked_in: { label: 'In', className: 'bg-status-checked-bg text-signal' },
  no_show: { label: 'No-show', className: 'bg-status-noshow-bg text-warn' },
  cancelled: { label: 'Cancelled', className: 'bg-paper-2 text-ink-3' },
};

export function StatusTag({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded ${config.className}`}
    >
      {config.label}
    </span>
  );
}
