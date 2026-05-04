'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Tenant, Sport, Court, Item, User, SubscriptionStatus } from '@/lib/types';
import { toast } from '@/components/toast';
import { OperatingHoursDisplay } from '@/components/operating-hours-editor';

interface TenantRow {
  id: string;
  name: string;
  subdomain: string;
  courtCount: number;
  freeTrialDays: number;
  subscriptionStatus: SubscriptionStatus;
  planTier: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  adminOverride: boolean;
  createdAt: string;
  stats: { users: number; bookings: number; members: number };
}

interface AttentionItem {
  id: string;
  name: string;
  subdomain: string;
  subscriptionStatus: SubscriptionStatus;
  planTier: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  adminOverride: boolean;
  attentionReason: 'trial_expiring' | 'trial_expired' | 'overdue' | 'admin_override';
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

function formatDateShort(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_BADGE_CLASSES: Record<SubscriptionStatus, string> = {
  active: 'bg-signal-soft text-signal-text',
  trial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  frozen: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  trial: 'Trial',
  frozen: 'Frozen',
};

const ATTENTION_LABELS: Record<string, string> = {
  trial_expiring: 'Trials expiring',
  trial_expired: 'Expired trials',
  overdue: 'Overdue',
  admin_override: 'Admin overrides',
};

const ATTENTION_COLORS: Record<string, string> = {
  trial_expiring: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  trial_expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  admin_override: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
};

/* ── Attention Notifications ── */
function AttentionSection({
  attention,
  onSelectTenant,
}: {
  attention: AttentionItem[];
  onSelectTenant: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (attention.length === 0) return null;

  const grouped: Record<string, AttentionItem[]> = {};
  for (const item of attention) {
    const key = item.attentionReason;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full bg-surface rounded-[16px] shadow-card p-4 text-left"
      >
        <div className="flex justify-between items-center mb-2">
          <div className="font-medium text-sm">Needs attention</div>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={`w-4 h-4 text-ink-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(grouped).map(([reason, items]) => (
            <span key={reason} className={`text-xs px-2.5 py-1 rounded-full font-medium ${ATTENTION_COLORS[reason]}`}>
              {items.length} {ATTENTION_LABELS[reason]}
            </span>
          ))}
        </div>
      </button>

      {expanded && (
        <div className="mt-1.5 space-y-1">
          {attention.map((item, idx) => (
            <button
              key={`${item.id}-${item.attentionReason}-${idx}`}
              onClick={() => onSelectTenant(item.id)}
              className="w-full text-left bg-surface rounded-xl p-3 hover:bg-surface-3 transition-colors flex justify-between items-center"
            >
              <div>
                <div className="font-medium text-sm">{item.name}</div>
                <div className="text-xs text-ink-3">{item.subdomain}.courtbooks.app</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS_BADGE_CLASSES[item.subscriptionStatus]}`}>
                  {STATUS_LABELS[item.subscriptionStatus]}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${ATTENTION_COLORS[item.attentionReason]}`}>
                  {ATTENTION_LABELS[item.attentionReason]}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Subscription Management Controls ── */
function SubscriptionControls({
  tenant,
  saving,
  onSave,
}: {
  tenant: Tenant;
  saving: boolean;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>(tenant.subscriptionStatus);
  const [planTier, setPlanTier] = useState<string>(tenant.planTier ?? '');
  const [periodEnd, setPeriodEnd] = useState(tenant.currentPeriodEnd ? tenant.currentPeriodEnd.slice(0, 10) : '');
  const [trialEnd, setTrialEnd] = useState(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '');
  const [override, setOverride] = useState(tenant.adminOverride);

  useEffect(() => {
    setStatus(tenant.subscriptionStatus);
    setPlanTier(tenant.planTier ?? '');
    setPeriodEnd(tenant.currentPeriodEnd ? tenant.currentPeriodEnd.slice(0, 10) : '');
    setTrialEnd(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '');
    setOverride(tenant.adminOverride);
  }, [tenant]);

  const handleSaveSubscription = async () => {
    const updates: Record<string, unknown> = {
      subscriptionStatus: status,
      planTier: planTier || null,
      currentPeriodEnd: periodEnd ? new Date(periodEnd + 'T23:59:59Z').toISOString() : null,
      trialEndsAt: trialEnd ? new Date(trialEnd + 'T23:59:59Z').toISOString() : null,
      adminOverride: override,
    };
    await onSave(updates);
    setEditing(false);
  };

  const handleActivateSubscription = async () => {
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    const updates: Record<string, unknown> = {
      subscriptionStatus: 'active' as SubscriptionStatus,
      planTier: planTier || 'basic',
      currentPeriodEnd: oneMonthFromNow.toISOString(),
      adminOverride: false,
    };
    await onSave(updates);
    setStatus('active');
    setPlanTier(planTier || 'basic');
    setPeriodEnd(oneMonthFromNow.toISOString().slice(0, 10));
    setOverride(false);
  };

  const resetForm = () => {
    setStatus(tenant.subscriptionStatus);
    setPlanTier(tenant.planTier ?? '');
    setPeriodEnd(tenant.currentPeriodEnd ? tenant.currentPeriodEnd.slice(0, 10) : '');
    setTrialEnd(tenant.trialEndsAt ? tenant.trialEndsAt.slice(0, 10) : '');
    setOverride(tenant.adminOverride);
    setEditing(false);
  };

  const selectClass = 'w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none';
  const inputClass = 'w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-3 mb-2">Subscription</div>
      <div className="bg-surface rounded-[16px] shadow-card p-4">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-ink-3 block mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)} className={selectClass}>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="frozen">Frozen</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-ink-3 block mb-1">Plan tier</label>
              <select value={planTier} onChange={(e) => setPlanTier(e.target.value)} className={selectClass}>
                <option value="">None</option>
                <option value="basic">Basic</option>
                <option value="basic_plus">Basic Plus</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            {status === 'trial' && (
              <div>
                <label className="text-xs text-ink-3 block mb-1">Trial ends</label>
                <input type="date" value={trialEnd} onChange={(e) => setTrialEnd(e.target.value)} className={inputClass} />
              </div>
            )}
            {['active', 'frozen'].includes(status) && (
              <div>
                <label className="text-xs text-ink-3 block mb-1">Current period end</label>
                <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputClass} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOverride(!override)}
                className={`w-10 h-5 rounded-full transition-colors relative ${override ? 'bg-primary' : 'bg-surface-3 border border-line'}`}
              >
                <span className={`block w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ${override ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <span className="text-xs text-ink-2">Admin override</span>
            </div>
            <div className="flex gap-2">
              <button disabled={saving} onClick={handleSaveSubscription} className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-medium">
                Save
              </button>
              <button onClick={resetForm} className="flex-1 bg-surface-3 text-ink-2 py-2.5 rounded-xl text-xs font-medium">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded font-medium ${STATUS_BADGE_CLASSES[tenant.subscriptionStatus]}`}>
                  {STATUS_LABELS[tenant.subscriptionStatus]}
                </span>
                {tenant.planTier && (
                  <span className="text-xs px-2.5 py-1 rounded font-medium bg-primary-soft text-primary-deep">
                    {tenant.planTier === 'pro' ? 'Pro' : 'Basic'}
                  </span>
                )}
                {tenant.adminOverride && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    Override
                  </span>
                )}
              </div>
              <button onClick={() => setEditing(true)}>
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-ink-4 hover:text-ink transition-colors">
                  <path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {tenant.subscriptionStatus === 'trial' && tenant.trialEndsAt && (
                <div>
                  <span className="text-ink-3">Trial ends:</span>{' '}
                  <span className="font-medium">{formatDateShort(tenant.trialEndsAt)}</span>
                </div>
              )}
              {tenant.currentPeriodEnd && (
                <div>
                  <span className="text-ink-3">Period end:</span>{' '}
                  <span className="font-medium">{formatDateShort(tenant.currentPeriodEnd)}</span>
                </div>
              )}
            </div>
            {tenant.subscriptionStatus !== 'active' && (
              <button
                disabled={saving}
                onClick={handleActivateSubscription}
                className="mt-3 w-full bg-signal-soft text-signal-text py-2.5 rounded-xl text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Activate subscription
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
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

      {/* Subscription Management */}
      <SubscriptionControls tenant={tenant} saving={saving} onSave={handleSave} />

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
                          <span className="text-ink-3">{'\u20B1'}{court.hourlyRate}/hr</span>
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
                  <div className="text-xs text-ink-3">{'\u20B1'}{item.price} · {item.type === 'rental' ? 'Rental' : 'Sale'}</div>
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
  const [attention, setAttention] = useState<AttentionItem[]>([]);
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
        const data = json.data ?? {};
        setTenants(data.tenants ?? []);
        setAttention(data.attention ?? []);
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

            {/* Attention notifications */}
            <AttentionSection attention={attention} onSelectTenant={setSelectedTenantId} />

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
                        <div className="font-medium text-sm flex items-center gap-2">
                          {tenant.name}
                          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${STATUS_BADGE_CLASSES[tenant.subscriptionStatus]}`}>
                            {STATUS_LABELS[tenant.subscriptionStatus]}
                          </span>
                          {tenant.planTier && (
                            <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-primary-soft text-primary-deep">
                              {tenant.planTier === 'pro' ? 'Pro' : 'Basic'}
                            </span>
                          )}
                        </div>
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
