'use client';

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12:00 MN';
  if (hour === 12) return '12:00 NN';
  const h = hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

interface TimeSelectProps {
  value: number;
  onChange: (hour: number) => void;
  min?: number;
  max?: number;
  label?: string;
  className?: string;
}

export function TimeSelect({ value, onChange, min = 0, max = 24, label, className = '' }: TimeSelectProps) {
  const options: number[] = [];
  for (let h = min; h <= max; h++) {
    options.push(h);
  }

  return (
    <div>
      {label && <label className="text-xs font-medium text-ink-3 block mb-1.5">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full bg-surface rounded-xl px-3 py-2.5 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none cursor-pointer ${className}`}
      >
        {options.map((h) => (
          <option key={h} value={h}>
            {formatHour(h)}
          </option>
        ))}
      </select>
    </div>
  );
}
