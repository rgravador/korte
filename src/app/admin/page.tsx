'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tenant, Sport, Court, Item, User } from '@/lib/types';
import { toast } from '@/components/toast';
import { OperatingHoursDisplay } from '@/components/operating-hours-editor';

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  courtCount: number;
  freeTrialDays: number;
  createdAt: string;
  stats: { users: number; bookings: number; members: number };
}

interface TenantDetail {
  tenant: Tenant;
  users: User[];
  sports: Sport[];
  courts: Court[];
  items: Item[];
  members: { id: string }[];
  bookings: { id: string }[];
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ── Tenant Detail View ── */
function TenantDetailView({ tenantId, onBack }: { tenantId: string; onBack: () => void }) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTrial, setEditingTrial] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [editingName, setEditingName] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/tenants/${tenantId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setDetail(json.data);
          setTrialDays(json.data.tenant.freeTrialDays ?? 7);
          setTenantName(json.data.tenant.name);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tenantId]);

  const handleSave = async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/tenants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, ...updates }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Failed to save');
      } else {
        toast.success('Saved');
        if (detail) {
          setDetail({ ...detail, tenant: { ...detail.tenant, ...updates } as Tenant });
        }
      }
    } catch {
      toast.error('Failed to save');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-ink-3 font-sans text-xs">Loading tenant...</div>;
  }

  if (!detail) {
    return <div className="text-center py-12 text-ink-3 font-sans text-xs">Tenant not found</div>;
  }

  const { tenant, sports, courts, items, users } = detail;

  return (
    <>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-ink-3 hover:text-ink mb-4 transition-colors">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path d="M10 4l-4 4 4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-xs font-medium">Back to Tenants</span>
      </button>

      {/* Tenant name */}
      {editingName ? (
        <div className="flex gap-2 mb-5">
          <input
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="flex-1 bg-surface-3 rounded-xl px-3 py-2 text-lg font-semibold border border-line focus:outline-none focus:border-primary"
          />
          <button
            disabled={saving}
            onClick={async () => { await handleSave({ name: tenantName.trim() }); setEditingName(false); }}
            className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-medium"
          >
            Save
          </button>
          <button onClick={() => { setEditingName(false); setTenantName(tenant.name); }} className="bg-surface-3 text-ink-3 px-4 py-2 rounded-xl text-xs font-medium">
            Cancel
          </button>
        </div>
      ) : (
        <button onClick={() => setEditingName(true)} className="mb-1">
          <h2 className="font-semibold text-2xl text-ink hover:text-primary transition-colors">{tenant.name}</h2>
        </button>
      )}
      <div className="text-xs text-ink-3 mb-5">{tenant.subdomain}.courtbooks.app · Created {formatDate(tenant.createdAt)}</div>

      {/* Free Trial Days */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-ink-3 mb-2">Free Trial</div>
        <div className="bg-surface rounded-[16px] shadow-card p-4">
          {editingTrial ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-ink-3 block mb-1">Trial period (days)</label>
                <input
                  type="number"
                  min="0"
                  max="365"
                  value={trialDays}
                  onChange={(e) => setTrialDays(Number(e.target.value))}
                  className="w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={saving}
                  onClick={async () => { await handleSave({ freeTrialDays: trialDays }); setEditingTrial(false); }}
                  className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-medium"
                >
                  Save
                </button>
                <button onClick={() => { setEditingTrial(false); setTrialDays(tenant.freeTrialDays ?? 7); }} className="flex-1 bg-surface-3 text-ink-2 py-2.5 rounded-xl text-xs font-medium">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setEditingTrial(true)} className="w-full text-left">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{tenant.freeTrialDays ?? 7} days</div>
                  <div className="text-xs text-ink-3 mt-0.5">Click to edit trial period</div>
                </div>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-ink-4">
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Sports */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-ink-3 mb-2">Sports ({sports.length})</div>
        {sports.length === 0 ? (
          <div className="bg-surface rounded-[16px] shadow-card p-4 text-xs text-ink-3">No sports configured</div>
        ) : (
          <div className="space-y-1.5">
            {sports.map((sport) => {
              const sportCourts = courts.filter((c) => c.sportId === sport.id);
              return (
                <div key={sport.id} className="bg-surface rounded-[16px] shadow-card p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{sport.name}</div>
                      <div className="text-xs text-ink-3 mt-0.5">
                        {sportCourts.length} court{sportCourts.length !== 1 ? 's' : ''}
                        {sport.operatingHoursRanges.length > 0 && (
                          <> · <OperatingHoursDisplay ranges={sport.operatingHoursRanges} /></>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${sport.isActive ? 'bg-signal-soft text-signal-text' : 'bg-surface-3 text-ink-3'}`}>
                      {sport.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {sportCourts.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-line space-y-1">
                      {sportCourts.map((court) => (
                        <div key={court.id} className="flex justify-between text-xs">
                          <span className="text-ink-2">{court.name}</span>
                          <span className="text-ink-3">₱{court.hourlyRate}/hr</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-ink-3 mb-2">Items ({items.length})</div>
        {items.length === 0 ? (
          <div className="bg-surface rounded-[16px] shadow-card p-4 text-xs text-ink-3">No items configured</div>
        ) : (
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.id} className="bg-surface rounded-[16px] shadow-card p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-sm">{item.name}</div>
                  <div className="text-xs text-ink-3">₱{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded ${item.isActive ? 'bg-signal-soft text-signal-text' : 'bg-surface-3 text-ink-3'}`}>
                  {item.isActive ? 'Active' : 'Off'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staff */}
      <div className="mb-6">
        <div className="text-xs font-semibold text-ink-3 mb-2">Staff ({users.length})</div>
        <div className="space-y-1.5">
          {users.map((user) => (
            <div key={user.id} className="bg-surface rounded-[16px] shadow-card p-3 flex justify-between items-center">
              <div>
                <div className="font-medium text-sm">{user.displayName}</div>
                <div className="text-xs text-ink-3">@{user.username} · {user.email || 'No email'}</div>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${user.role === 'tenant_admin' ? 'bg-primary-soft text-primary-deep' : 'bg-signal-soft text-signal-text'}`}>
                {user.role === 'tenant_admin' ? 'Admin' : 'Staff'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Main Admin Page ── */
export default function AdminPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

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

  const handleLogout = async () => {
    await useStore.getState().logout();
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

        {selectedTenantId ? (
          <TenantDetailView
            tenantId={selectedTenantId}
            onBack={() => setSelectedTenantId(null)}
          />
        ) : (
          <>
            <h1 className="font-sans font-light text-2xl tracking-tight mb-1">
              Tenants
            </h1>
            <p className="font-sans text-xs text-ink-3 mb-4">
              {tenants.length} facilit{tenants.length === 1 ? 'y' : 'ies'} registered
            </p>

            {/* Search */}
            <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2.5 border border-line mb-4">
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
                  <button
                    key={tenant.id}
                    onClick={() => setSelectedTenantId(tenant.id)}
                    className="w-full text-left bg-surface rounded-[16px] shadow-card p-4 hover:bg-surface-3 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">{tenant.name}</div>
                        <div className="font-sans text-xs text-ink-3">
                          {tenant.subdomain}.courtbooks.app · {tenant.courtCount} court{tenant.courtCount !== 1 ? 's' : ''} · {tenant.freeTrialDays}d trial
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
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
