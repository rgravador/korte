import { BookingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-primary-soft text-primary-deep' },
  pending: { label: 'Pending', className: 'bg-pending-bg text-pending-text' },
  checked_in: { label: 'In', className: 'bg-signal-soft text-signal-text' },
  no_show: { label: 'No-show', className: 'bg-warn-soft text-warn-text' },
  cancelled: { label: 'Cancelled', className: 'bg-surface-3 text-ink-3' },
};

export function StatusTag({ status }: { status: BookingStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`text-xs font-medium px-2.5 py-1 rounded-tag ${config.className}`}
    >
      {config.label}
    </span>
  );
}
