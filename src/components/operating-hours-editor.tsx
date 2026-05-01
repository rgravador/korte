'use client';

import { TimeRange } from '@/lib/types';
import { TimeSelect } from '@/components/time-select';

function formatHour(hour: number): string {
  if (hour === 0 || hour === 24) return '12:00 MN';
  if (hour === 12) return '12:00 NN';
  const h = hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${ampm}`;
}

interface OperatingHoursEditorProps {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
}

export function OperatingHoursEditor({ ranges, onChange }: OperatingHoursEditorProps) {
  const updateRange = (index: number, field: 'start' | 'end', value: number) => {
    const updated = [...ranges];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addRange = () => {
    // Find a gap after the last range
    const last = ranges[ranges.length - 1];
    const newStart = Math.min(last.end + 1, 22);
    const newEnd = Math.min(newStart + 4, 24);
    if (newStart >= newEnd) return;
    onChange([...ranges, { start: newStart, end: newEnd }]);
  };

  const removeRange = (index: number) => {
    if (ranges.length <= 1) return;
    onChange(ranges.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2.5">
      {ranges.map((range, index) => (
        <div key={index} className="flex items-end gap-2">
          <div className="flex-1">
            <TimeSelect
              label={index === 0 ? 'Opens' : `Opens (#${index + 1})`}
              value={range.start}
              onChange={(v) => updateRange(index, 'start', v)}
              min={0}
              max={22}
            />
          </div>
          <div className="flex-1">
            <TimeSelect
              label={index === 0 ? 'Closes' : `Closes (#${index + 1})`}
              value={range.end}
              onChange={(v) => updateRange(index, 'end', v)}
              min={range.start + 1}
              max={24}
            />
          </div>
          {ranges.length > 1 && (
            <button
              onClick={() => removeRange(index)}
              className="w-8 h-[42px] flex items-center justify-center text-warn text-sm rounded-lg hover:bg-warn-soft transition-colors"
              aria-label="Remove time range"
            >
              &times;
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addRange}
        className="w-full border border-dashed border-line text-ink-3 py-2 rounded-xl text-xs hover:border-primary/40 hover:text-primary transition-colors"
      >
        + Add another open window
      </button>
    </div>
  );
}

/** Read-only display of operating hour ranges. */
export function OperatingHoursDisplay({ ranges }: { ranges: TimeRange[] }) {
  return (
    <span>
      {ranges.map((r, i) => (
        <span key={i}>
          {i > 0 && ', '}
          {formatHour(r.start)} – {formatHour(r.end)}
        </span>
      ))}
    </span>
  );
}
