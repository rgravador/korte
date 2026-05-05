'use client';


import { AppShell } from '@/components/app-shell';
import { useStore } from '@/store';
import { useMemo, useState } from 'react';

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'YTD', days: 0 },
] as const;

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HOUR_LABELS = ['8', '10', '12', '14', '16', '18', '20'];
const HEAT_COLORS = [
  'bg-surface-3',
  'bg-line',
  'bg-primary-soft',
  'bg-primary',
  'bg-primary-deep',
];

function getDateDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function getYearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export default function ReportsPage() {
  const { bookings } = useStore();
  const [activePeriod, setActivePeriod] = useState(1); // 30d default

  const periodConfig = PERIODS[activePeriod];
  const startDate = periodConfig.days === 0 ? getYearStart() : getDateDaysAgo(periodConfig.days);

  const filteredBookings = useMemo(
    () => bookings.filter((b) => b.date >= startDate && b.status !== 'cancelled'),
    [bookings, startDate]
  );

  const totalBookings = filteredBookings.length;
  const noShowCount = filteredBookings.filter((b) => b.status === 'no_show').length;
  const noShowRate = totalBookings > 0 ? Math.round((noShowCount / totalBookings) * 100) : 0;

  // Build heatmap data: for each hour block (8,10,12,14,16,18,20) x each day of week
  const heatmapData = useMemo(() => {
    const grid: number[][] = [];
    const hours = [8, 10, 12, 14, 16, 18, 20];

    for (const hour of hours) {
      const row: number[] = [];
      for (let dow = 0; dow < 7; dow++) {
        const count = filteredBookings.filter((b) => {
          const bDate = new Date(b.date);
          const bDow = (bDate.getDay() + 6) % 7; // Monday=0
          return bDow === dow && b.startHour >= hour && b.startHour < hour + 2;
        }).length;
        row.push(count);
      }
      grid.push(row);
    }

    // Normalize to 0-4 scale
    const maxVal = Math.max(1, ...grid.flat());
    return grid.map((row) =>
      row.map((val) => Math.min(4, Math.floor((val / maxVal) * 5)))
    );
  }, [filteredBookings]);

  // Simple sparkline data (last 14 data points)
  const sparklineData = useMemo(() => {
    const points: number[] = [];
    const days = 14;
    for (let i = days - 1; i >= 0; i--) {
      const date = getDateDaysAgo(i);
      const count = bookings.filter(
        (b) => b.date === date && b.status !== 'cancelled'
      ).length;
      points.push(count);
    }
    return points;
  }, [bookings]);

  const maxSpark = Math.max(1, ...sparklineData);
  const sparklinePath = sparklineData
    .map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * 280;
      const y = 60 - (val / maxSpark) * 50;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  const sparklineFill = `${sparklinePath} L280 70 L0 70 Z`;
  const lastPoint = sparklineData[sparklineData.length - 1];
  const lastX = 280;
  const lastY = 60 - (lastPoint / maxSpark) * 50;

  return (
    <AppShell>
        <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-1 text-ink">Reports</h1>

        {/* Period selector */}
        <div className="flex gap-1.5 mb-4 mt-3">
          {PERIODS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => setActivePeriod(i)}
              className={`px-2.5 py-1 border rounded-full text-base ${
                i === activePeriod
                  ? 'bg-primary text-white border-primary'
                  : 'border-line text-ink-2'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Headline metric */}
        <div className="font-sans text-[44px] font-bold leading-none tracking-tight">
          <span className="text-ink">{totalBookings}</span>
        </div>
        <div className="font-sans text-base text-ink-3 mt-1">
          Bookings · {periodConfig.label}
        </div>

        {/* Sparkline */}
        <svg viewBox="0 0 280 70" className="w-full my-3 overflow-visible">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={sparklineFill} fill="url(#sparkGrad)" />
          <path
            d={sparklinePath}
            fill="none"
            stroke="#0F172A"
            strokeWidth="1.4"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle
            cx={lastX}
            cy={lastY}
            r="3"
            fill="#3B82F6"
            stroke="#0F172A"
            strokeWidth="1.2"
          />
        </svg>

        <div className="h-px bg-line my-3" />

        {/* No-show rate */}
        <div className="flex justify-between items-baseline mb-4">
          <div>
            <div className="font-sans text-base text-ink-3">No-show rate</div>
            <div className="font-sans text-xl font-light">{noShowRate}%</div>
          </div>
          <div className="text-right">
            <div className="font-sans text-base text-ink-3">No-shows</div>
            <div className="font-sans text-xl font-light">{noShowCount}</div>
          </div>
        </div>

        <div className="h-px bg-line my-3" />

        {/* Utilization heatmap */}
        <div className="font-sans text-base text-ink-3 mb-2">
          Utilization · by hour
        </div>

        <div className="grid gap-0.5" style={{ gridTemplateColumns: '22px repeat(7, 1fr)' }}>
          {heatmapData.map((row, ri) => (
            <div key={ri} className="contents">
              <div className="font-sans text-base text-ink-3 flex items-center justify-end pr-0.5">
                {HOUR_LABELS[ri]}
              </div>
              {row.map((val, ci) => (
                <div
                  key={ci}
                  className={`aspect-square rounded-sm ${HEAT_COLORS[val]}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Day labels */}
        <div className="flex justify-between text-base text-ink-3 mt-1.5 pl-6">
          {DAYS_OF_WEEK.map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>

      
    </AppShell>
  );
}
