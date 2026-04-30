'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  courtCount: number;
  createdAt: string;
  stats: { users: number; bookings: number; members: number };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'system_admin') {
      router.replace('/');
      return;
    }
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((json) => {
        setTenants(json.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser, router]);

  const filtered = search
    ? tenants.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(search.toLowerCase())
      )
    : tenants;

  const handleLogout = () => {
    useStore.getState().logout();
    router.push('/');
  };

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
              href="/admin/reports"
              className="font-sans text-xs text-ink-3 hover:text-primary"
            >
              Reports
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
          Tenants
        </h1>
        <p className="font-sans text-xs text-ink-3 mb-4">
          {tenants.length} facilit{tenants.length === 1 ? 'y' : 'ies'} registered
        </p>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 border border-line mb-4">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5" />
            <path d="m11 11 4 4" />
          </svg>
          <input
            type="text"
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search tenants"
            className="flex-1 bg-transparent text-sm font-sans focus:outline-none placeholder:text-ink-3"
          />
        </div>

        {/* Tenant list */}
        {loading ? (
          <div className="text-center py-12 text-ink-3 font-sans text-xs">Loading tenants...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-ink-3 font-sans text-xs">
            {search ? 'No tenants match your search' : 'No tenants yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((tenant) => (
              <div key={tenant.id} className="bg-white rounded-[16px] shadow-card p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{tenant.name}</div>
                    <div className="font-sans text-xs text-ink-3">
                      {tenant.subdomain}.courtbooks.app · {tenant.courtCount} court{tenant.courtCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="font-sans text-xs text-ink-3">
                    {formatDate(tenant.createdAt)}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="bg-surface-3 rounded-lg p-2">
                    <div className="font-sans text-[11px] text-ink-3">Bookings</div>
                    <div className="font-sans text-lg leading-none mt-0.5">{tenant.stats.bookings}</div>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-2">
                    <div className="font-sans text-[11px] text-ink-3">Members</div>
                    <div className="font-sans text-lg leading-none mt-0.5">{tenant.stats.members}</div>
                  </div>
                  <div className="bg-surface-3 rounded-lg p-2">
                    <div className="font-sans text-[11px] text-ink-3">Users</div>
                    <div className="font-sans text-lg leading-none mt-0.5">{tenant.stats.users}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
