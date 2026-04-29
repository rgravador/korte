import { BookingStatus } from '@/lib/types';

const STATUS_CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: 'Confirmed', className: 'bg-accent-soft text-[#6F5A1A]' },
  pending: { label: 'Pending', className: 'bg-[#F4E1D8] text-[#8A4A2D]' },
  checked_in: { label: 'In', className: 'bg-[#D8E5DD] text-signal' },
  no_show: { label: 'No-show', className: 'bg-[#F4D8D8] text-warn' },
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
