'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PlatformStats {
  totals: {
    tenants: number;
    bookings: number;
    members: number;
    users: number;
  };
  bookingsByStatus: Record<string, number>;
  bookingsByDay: Record<string, number>;
  tenantsByMonth: Record<string, number>;
}

export default function AdminReportsPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'system_admin') {
      router.replace('/');
      return;
    }
    fetch('/api/admin/stats')
      .then((r) => r.json())
      .then((json) => {
        setStats(json.data ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser, router]);

  const handleLogout = () => {
    useStore.getState().logout();
    router.push('/');
  };

  // Build sparkline from bookingsByDay
  const sparkData = (() => {
    if (!stats) return [];
    const days: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().split('T')[0]);
    }
    return days.map((d) => stats.bookingsByDay[d] ?? 0);
  })();

  const maxSpark = Math.max(1, ...sparkData);
  const sparkPath = sparkData
    .map((val, i) => {
      const x = (i / (sparkData.length - 1)) * 280;
      const y = 60 - (val / maxSpark) * 50;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');
  const sparkFill = sparkData.length > 0 ? `${sparkPath} L280 70 L0 70 Z` : '';

  // Tenant growth
  const monthLabels = stats
    ? Object.keys(stats.tenantsByMonth).sort()
    : [];
  const monthValues = monthLabels.map((m) => stats?.tenantsByMonth[m] ?? 0);
  const maxMonth = Math.max(1, ...monthValues);

  return (
    <div className="min-h-screen bg-surface-2 max-w-2xl mx-auto">
      <div className="px-5 pt-4 pb-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="font-sans font-normal italic text-lg tracking-tight">
              Court<span className="text-primary not-italic">.</span>
              <span className="font-sans text-xs text-primary font-semibold ml-2 not-italic">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="font-sans text-xs text-ink-3 hover:text-primary"
            >
              Tenants
            </Link>
            <button
              onClick={handleLogout}
              className="font-sans text-xs text-warn"
            >
              Sign out
            </button>
          </div>
        </div>

        <h1 className="font-sans font-light text-2xl tracking-tight mb-1">
          Platform Reports
        </h1>
        <p className="font-sans text-xs text-ink-3 mb-6">
          Cross-tenant performance
        </p>

        {loading || !stats ? (
          <div className="text-center py-12 text-ink-3 font-sans text-xs">Loading stats...</div>
        ) : (
          <>
            {/* Platform KPIs */}
            <div className="grid grid-cols-4 gap-2 mb-6">
              <div className="bg-white rounded-[16px] shadow-card p-3">
                <div className="font-sans text-[11px] text-ink-3 mb-1">Tenants</div>
                <div className="font-sans text-2xl leading-none">{stats.totals.tenants}</div>
              </div>
              <div className="bg-white rounded-[16px] shadow-card p-3">
                <div className="font-sans text-[11px] text-ink-3 mb-1">Bookings</div>
                <div className="font-sans text-2xl leading-none">{stats.totals.bookings}</div>
              </div>
              <div className="bg-white rounded-[16px] shadow-card p-3">
                <div className="font-sans text-[11px] text-ink-3 mb-1">Members</div>
                <div className="font-sans text-2xl leading-none">{stats.totals.members}</div>
              </div>
              <div className="bg-white rounded-[16px] shadow-card p-3">
                <div className="font-sans text-[11px] text-ink-3 mb-1">Users</div>
                <div className="font-sans text-2xl leading-none">{stats.totals.users}</div>
              </div>
            </div>

            {/* Bookings trend (30 days) */}
            <div className="mb-6">
              <div className="font-sans text-xs text-ink-3 mb-2">
                Bookings · last 30 days
              </div>
              <div className="bg-white rounded-[16px] shadow-card p-4">
                <svg viewBox="0 0 280 70" className="w-full overflow-visible">
                  <defs>
                    <linearGradient id="adminSparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {sparkFill && <path d={sparkFill} fill="url(#adminSparkGrad)" />}
                  {sparkPath && (
                    <path d={sparkPath} fill="none" stroke="#0F172A" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" />
                  )}
                </svg>
              </div>
            </div>

            {/* Bookings by status */}
            <div className="mb-6">
              <div className="font-sans text-xs text-ink-3 mb-2">
                Bookings by status
              </div>
              <div className="bg-white rounded-[16px] shadow-card p-4 space-y-2">
                {Object.entries(stats.bookingsByStatus).map(([status, count]) => {
                  const total = stats.totals.bookings || 1;
                  const pct = Math.round((count / total) * 100);
                  return (
                    <div key={status}>
                      <div className="flex justify-between mb-1">
                        <span className="font-sans text-xs text-ink-2">{status.replace('_', ' ')}</span>
                        <span className="font-sans text-xs text-ink-3">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tenant growth */}
            {monthLabels.length > 0 && (
              <div className="mb-6">
                <div className="font-sans text-xs text-ink-3 mb-2">
                  Tenant signups by month
                </div>
                <div className="bg-white rounded-[16px] shadow-card p-4">
                  <div className="flex items-end gap-1" style={{ height: '80px' }}>
                    {monthLabels.map((month, i) => {
                      const val = monthValues[i];
                      const heightPct = (val / maxMonth) * 100;
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center gap-1">
                          <div className="font-sans text-xs text-ink-3">{val}</div>
                          <div
                            className="w-full bg-primary rounded-sm"
                            style={{ height: `${Math.max(heightPct, 4)}%` }}
                          />
                          <div className="font-sans text-[11px] text-ink-3">
                            {month.slice(5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
