'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { QRCodeCanvas } from 'qrcode.react';
import { Tenant, Sport, Court, Item, User, SubscriptionStatus, Plan } from '@/lib/types';
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

const PLAN_TIER_LABELS: Record<string, string> = {
  basic: 'Basic',
  basic_plus: 'Basic Plus',
  pro: 'Pro',
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
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  // Custom Max sub-package creation
  const [showMaxForm, setShowMaxForm] = useState(false);
  const [maxPlanName, setMaxPlanName] = useState(`${tenant.name} Max`);
  const [maxSports, setMaxSports] = useState(10);
  const [maxCourts, setMaxCourts] = useState(50);
  const [maxAdmins, setMaxAdmins] = useState(5);
  const [maxStaff, setMaxStaff] = useState(20);
  const [maxBasePrice, setMaxBasePrice] = useState(2999);
  const [maxPerExtraCourt, setMaxPerExtraCourt] = useState(0);
  const [maxIncludedCourts, setMaxIncludedCourts] = useState(0);
  const [creatingMax, setCreatingMax] = useState(false);

  useEffect(() => {
    fetch('/api/admin/plans')
      .then((r) => r.json())
      .then((json) => setAvailablePlans((json.data ?? []).filter((p: Plan) => p.isActive)))
      .catch(() => {});
  }, []);

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

  const selectedPlan = availablePlans.find((p) => p.slug === planTier);
  const isContactOnlySelected = selectedPlan?.isContactOnly ?? false;

  const handlePlanTierChange = (slug: string) => {
    const plan = availablePlans.find((p) => p.slug === slug);
    if (plan?.isContactOnly) {
      setPlanTier(slug);
      setShowMaxForm(true);
      setMaxPlanName(`${tenant.name} Max`);
    } else {
      setPlanTier(slug);
      setShowMaxForm(false);
    }
  };

  const handleCreateMaxPlan = async () => {
    setCreatingMax(true);
    try {
      const slug = `max_${tenant.subdomain}`.replace(/[^a-z0-9_]/g, '_');
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: maxPlanName.trim(),
          slug,
          description: `Custom Max plan for ${tenant.name}`,
          basePrice: maxBasePrice,
          perExtraCourt: maxPerExtraCourt,
          includedCourts: maxIncludedCourts,
          maxSports: maxSports,
          maxCourts: maxCourts,
          maxAdmins: maxAdmins,
          maxStaff: maxStaff,
          isActive: true,
          isContactOnly: false,
          sortOrder: 100,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Failed to create plan');
        setCreatingMax(false);
        return;
      }
      const newPlan = json.data;
      toast.success(`Plan "${newPlan.name}" created`);
      setAvailablePlans((prev) => [...prev, newPlan]);
      setPlanTier(newPlan.slug);
      setShowMaxForm(false);
    } catch {
      toast.error('Failed to create plan');
    }
    setCreatingMax(false);
  };

  const resetForm = () => {
    setStatus(tenant.subscriptionStatus);
    setPlanTier(tenant.planTier ?? '');
    setShowMaxForm(false);
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
              <select value={isContactOnlySelected ? selectedPlan?.slug ?? '' : planTier} onChange={(e) => handlePlanTierChange(e.target.value)} className={selectClass}>
                <option value="">None</option>
                {availablePlans.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name}{p.isContactOnly ? ' (Custom)' : ''}</option>
                ))}
              </select>
            </div>

            {/* Max sub-package form */}
            {showMaxForm && (
              <div className="bg-surface-3 rounded-xl p-3 space-y-2.5 border border-line">
                <div className="text-xs font-semibold text-ink-3">Create custom plan for {tenant.name}</div>
                <div>
                  <label className="text-xs text-ink-3 block mb-1">Plan name</label>
                  <input type="text" value={maxPlanName} onChange={(e) => setMaxPlanName(e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Base price (₱/mo)</label>
                    <input type="number" value={maxBasePrice} onChange={(e) => setMaxBasePrice(Number(e.target.value))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Max sports</label>
                    <input type="number" value={maxSports} onChange={(e) => setMaxSports(Number(e.target.value))} className={inputClass} placeholder="0 = unlimited" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Max courts</label>
                    <input type="number" value={maxCourts} onChange={(e) => setMaxCourts(Number(e.target.value))} className={inputClass} placeholder="0 = unlimited" />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Max admins</label>
                    <input type="number" value={maxAdmins} onChange={(e) => setMaxAdmins(Number(e.target.value))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Max staff</label>
                    <input type="number" value={maxStaff} onChange={(e) => setMaxStaff(Number(e.target.value))} className={inputClass} />
                  </div>
                  <div>
                    <label className="text-xs text-ink-3 block mb-1">Per extra court (₱)</label>
                    <input type="number" value={maxPerExtraCourt} onChange={(e) => setMaxPerExtraCourt(Number(e.target.value))} className={inputClass} />
                  </div>
                  {maxPerExtraCourt > 0 && (
                    <div>
                      <label className="text-xs text-ink-3 block mb-1">Included courts</label>
                      <input type="number" value={maxIncludedCourts} onChange={(e) => setMaxIncludedCourts(Number(e.target.value))} className={inputClass} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-ink-3">0 = unlimited for court/sport/admin/staff fields</p>
                <button
                  disabled={creatingMax || !maxPlanName.trim()}
                  onClick={handleCreateMaxPlan}
                  className="w-full bg-primary text-white py-2.5 rounded-xl text-xs font-medium disabled:opacity-50"
                >
                  {creatingMax ? 'Creating...' : `Create "${maxPlanName.trim()}" plan`}
                </button>
              </div>
            )}

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
                    {availablePlans.find((p) => p.slug === tenant.planTier)?.name ?? PLAN_TIER_LABELS[tenant.planTier] ?? tenant.planTier}
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

/* ── Plan Management ── */
interface PlanFormData {
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  perExtraCourt: number;
  includedCourts: number;
  maxSports: number;
  maxCourts: number;
  maxAdmins: number;
  maxStaff: number;
  isActive: boolean;
  isContactOnly: boolean;
  sortOrder: number;
}

const EMPTY_PLAN_FORM: PlanFormData = {
  name: '',
  slug: '',
  description: '',
  basePrice: 0,
  perExtraCourt: 0,
  includedCourts: 1,
  maxSports: 1,
  maxCourts: 0,
  maxAdmins: 1,
  maxStaff: 2,
  isActive: true,
  isContactOnly: false,
  sortOrder: 0,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function PlanForm({
  initial,
  isNew,
  saving,
  onSave,
  onCancel,
}: {
  initial: PlanFormData;
  isNew: boolean;
  saving: boolean;
  onSave: (data: PlanFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<PlanFormData>(initial);
  const [autoSlug, setAutoSlug] = useState(isNew);

  const updateField = <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'name' && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
  };

  const inputClass = 'w-full bg-surface-3 rounded-xl px-3 py-2 text-sm border border-line focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{isNew ? 'New Plan' : `Edit: ${initial.name}`}</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-3 block mb-1">Name</label>
          <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-3 block mb-1">Slug</label>
          <input
            value={form.slug}
            onChange={(e) => { setAutoSlug(false); updateField('slug', e.target.value); }}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="text-xs text-ink-3 block mb-1">Description</label>
        <input value={form.description} onChange={(e) => updateField('description', e.target.value)} className={inputClass} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-3 block mb-1">Base price</label>
          <input type="number" min="0" value={form.basePrice} onChange={(e) => updateField('basePrice', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-3 block mb-1">Per extra court</label>
          <input type="number" min="0" value={form.perExtraCourt} onChange={(e) => updateField('perExtraCourt', Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-3 block mb-1">Included courts</label>
          <input type="number" min="0" value={form.includedCourts} onChange={(e) => updateField('includedCourts', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-3 block mb-1">Max sports</label>
          <input type="number" min="0" value={form.maxSports} onChange={(e) => updateField('maxSports', Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-ink-3 block mb-1">Max courts <span className="text-ink-4">(0 = unlimited)</span></label>
          <input type="number" min="0" value={form.maxCourts} onChange={(e) => updateField('maxCourts', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-3 block mb-1">Max admins</label>
          <input type="number" min="0" value={form.maxAdmins} onChange={(e) => updateField('maxAdmins', Number(e.target.value))} className={inputClass} />
        </div>
        <div>
          <label className="text-xs text-ink-3 block mb-1">Max staff</label>
          <input type="number" min="0" value={form.maxStaff} onChange={(e) => updateField('maxStaff', Number(e.target.value))} className={inputClass} />
        </div>
      </div>

      <div>
        <label className="text-xs text-ink-3 block mb-1">Sort order</label>
        <input type="number" min="0" value={form.sortOrder} onChange={(e) => updateField('sortOrder', Number(e.target.value))} className={inputClass} />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateField('isActive', !form.isActive)}
            className={`w-10 h-5 rounded-full transition-colors relative ${form.isActive ? 'bg-primary' : 'bg-surface-3 border border-line'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-ink-2">Active</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateField('isContactOnly', !form.isContactOnly)}
            className={`w-10 h-5 rounded-full transition-colors relative ${form.isContactOnly ? 'bg-primary' : 'bg-surface-3 border border-line'}`}
          >
            <span className={`block w-4 h-4 rounded-full bg-white shadow absolute top-0.5 transition-transform ${form.isContactOnly ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-xs text-ink-2">Contact only</span>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          disabled={saving || !form.name.trim() || !form.slug.trim()}
          onClick={() => onSave(form)}
          className="flex-1 bg-primary text-white py-2.5 rounded-xl text-xs font-medium disabled:opacity-50"
        >
          {saving ? 'Saving...' : isNew ? 'Create Plan' : 'Save Changes'}
        </button>
        <button onClick={onCancel} className="flex-1 bg-surface-3 text-ink-2 py-2.5 rounded-xl text-xs font-medium">
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── QR Code Section ── */

function QrCodeSection() {
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const appDomain = typeof window !== 'undefined' ? window.location.origin : '';

  const handleDownload = useCallback(() => {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;

    // Create a new canvas with padding and branding
    const pad = 32;
    const labelHeight = 48;
    const w = canvas.width + pad * 2;
    const h = canvas.height + pad * 2 + labelHeight;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(canvas, pad, pad);

    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Korte — Court Booking', w / 2, canvas.height + pad + 28);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Scan to get started', w / 2, canvas.height + pad + 44);

    const link = document.createElement('a');
    link.download = 'korte-qr-code.png';
    link.href = out.toDataURL('image/png');
    link.click();
  }, []);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(appDomain);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const handleShare = useCallback(async () => {
    const canvas = qrRef.current?.querySelector('canvas');

    if (navigator.share) {
      const shareData: ShareData = {
        title: 'Korte — Court Booking Platform',
        text: 'Book your court on Korte!',
        url: appDomain,
      };

      // Try sharing with image if supported
      if (canvas) {
        try {
          const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (blob) {
            const file = new File([blob], 'korte-qr-code.png', { type: 'image/png' });
            if (navigator.canShare?.({ files: [file] })) {
              shareData.files = [file];
            }
          }
        } catch { /* fall through to share without image */ }
      }

      try {
        await navigator.share(shareData);
      } catch { /* user cancelled */ }
    } else {
      await handleCopyLink();
      toast.success('Link copied to clipboard');
    }
  }, [handleCopyLink]);

  return (
    <div>
      <h1 className="font-sans font-light text-2xl tracking-tight mb-1">QR Code</h1>
      <p className="font-sans text-xs text-ink-3 mb-6">
        Share this QR code with new tenants so they can access the app and register their facility.
      </p>

      {/* QR Code Card */}
      <div className="bg-surface rounded-[16px] shadow-card p-6 flex flex-col items-center">
        <div ref={qrRef} className="bg-white rounded-xl p-4">
          <QRCodeCanvas
            value={appDomain}
            size={200}
            level="H"
            marginSize={0}
          />
        </div>

        <div className="mt-4 text-center">
          <div className="font-sans text-sm font-medium text-ink">Korte — Court Booking</div>
          <div className="font-sans text-xs text-ink-3 mt-0.5">Scan to access the platform</div>
        </div>

        {/* URL display */}
        <div className="mt-4 w-full bg-surface-3 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
          <span className="font-mono text-xs text-ink-3 truncate">{appDomain}</span>
          <button
            onClick={handleCopyLink}
            className="font-sans text-xs text-primary font-medium flex-shrink-0"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Actions */}
        <div className="mt-4 w-full grid grid-cols-2 gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-primary-deep"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M8 2v9M4 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h12" strokeLinecap="round" />
            </svg>
            Download PNG
          </button>
          <button
            onClick={handleShare}
            className="flex items-center justify-center gap-2 bg-surface-3 text-ink py-3 rounded-xl text-xs font-semibold transition-colors hover:bg-line"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="4" r="2" />
              <circle cx="4" cy="8" r="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 7l4-2M6 9l4 2" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-4 bg-surface rounded-[16px] shadow-card p-4 space-y-2">
        <div className="font-sans text-xs font-semibold text-ink-3 uppercase tracking-wider">How to use</div>
        <ul className="font-sans text-xs text-ink-3 space-y-1.5">
          <li className="flex gap-2"><span className="text-primary font-semibold">1.</span> Download or share the QR code with prospective court owners</li>
          <li className="flex gap-2"><span className="text-primary font-semibold">2.</span> They scan it to open the app and register their facility</li>
          <li className="flex gap-2"><span className="text-primary font-semibold">3.</span> Print it for events, flyers, or post it on social media</li>
        </ul>
      </div>
    </div>
  );
}

function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetch('/api/admin/plans')
      .then((r) => r.json())
      .then((json) => {
        const data = json.data ?? [];
        setPlans(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder);

  const handleCreate = async (data: PlanFormData) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Failed to create plan');
      } else {
        toast.success('Plan created');
        setPlans((prev) => [...prev, json.data]);
        setCreating(false);
      }
    } catch {
      toast.error('Failed to create plan');
    }
    setSaving(false);
  };

  const handleUpdate = async (planId: string, data: PlanFormData) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Failed to update plan');
      } else {
        toast.success('Plan updated');
        setPlans((prev) => prev.map((p) => (p.id === planId ? json.data : p)));
        setEditingPlanId(null);
      }
    } catch {
      toast.error('Failed to update plan');
    }
    setSaving(false);
  };

  const handleDeactivate = async (planId: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/plans/${planId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || json.error) {
        toast.error(json.error?.message ?? 'Failed to deactivate plan');
      } else {
        toast.success('Plan deactivated');
        setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, isActive: false } : p)));
      }
    } catch {
      toast.error('Failed to deactivate plan');
    }
    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12 text-ink-3 font-sans text-xs">Loading plans...</div>;
  }

  if (creating) {
    return (
      <div className="bg-surface rounded-[16px] shadow-card p-4">
        <PlanForm
          initial={EMPTY_PLAN_FORM}
          isNew
          saving={saving}
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  if (editingPlanId) {
    const plan = plans.find((p) => p.id === editingPlanId);
    if (!plan) return null;
    const formData: PlanFormData = {
      name: plan.name,
      slug: plan.slug,
      description: plan.description ?? '',
      basePrice: plan.basePrice,
      perExtraCourt: plan.perExtraCourt,
      includedCourts: plan.includedCourts,
      maxSports: plan.maxSports,
      maxCourts: plan.maxCourts,
      maxAdmins: plan.maxAdmins,
      maxStaff: plan.maxStaff,
      isActive: plan.isActive,
      isContactOnly: plan.isContactOnly,
      sortOrder: plan.sortOrder,
    };
    return (
      <div className="bg-surface rounded-[16px] shadow-card p-4">
        <PlanForm
          initial={formData}
          isNew={false}
          saving={saving}
          onSave={(data) => handleUpdate(editingPlanId, data)}
          onCancel={() => setEditingPlanId(null)}
        />
      </div>
    );
  }

  return (
    <>
      <h1 className="font-sans font-light text-2xl tracking-tight mb-1">Plans</h1>
      <p className="font-sans text-xs text-ink-3 mb-4">
        {plans.length} plan{plans.length !== 1 ? 's' : ''} configured
      </p>

      {sortedPlans.length === 0 ? (
        <div className="text-center py-12 text-ink-3 font-sans text-xs">No plans yet</div>
      ) : (
        <div className="space-y-2">
          {sortedPlans.map((plan) => (
            <button
              key={plan.id}
              onClick={() => setEditingPlanId(plan.id)}
              className={`w-full text-left bg-surface rounded-[16px] shadow-card p-4 hover:bg-surface-3 transition-colors ${!plan.isActive ? 'opacity-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-sm flex items-center gap-2">
                    {plan.name}
                    {!plan.isActive && (
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-surface-3 text-ink-3">Inactive</span>
                    )}
                    {plan.isContactOnly && (
                      <span className="text-[11px] px-2 py-0.5 rounded font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Contact only</span>
                    )}
                  </div>
                  <div className="font-sans text-xs text-ink-3 mt-0.5">{plan.slug}</div>
                </div>
                <div className="font-sans text-sm font-medium">
                  {plan.basePrice > 0 ? `\u20B1${plan.basePrice}/mo` : 'Free'}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 mt-3">
                <div className="bg-surface-3 rounded-lg p-2">
                  <div className="font-sans text-[11px] text-ink-3">Sports</div>
                  <div className="font-sans text-lg leading-none mt-0.5">{plan.maxSports}</div>
                </div>
                <div className="bg-surface-3 rounded-lg p-2">
                  <div className="font-sans text-[11px] text-ink-3">Courts</div>
                  <div className="font-sans text-lg leading-none mt-0.5">{plan.maxCourts === 0 ? '\u221E' : plan.maxCourts}</div>
                </div>
                <div className="bg-surface-3 rounded-lg p-2">
                  <div className="font-sans text-[11px] text-ink-3">Admins</div>
                  <div className="font-sans text-lg leading-none mt-0.5">{plan.maxAdmins}</div>
                </div>
                <div className="bg-surface-3 rounded-lg p-2">
                  <div className="font-sans text-[11px] text-ink-3">Staff</div>
                  <div className="font-sans text-lg leading-none mt-0.5">{plan.maxStaff}</div>
                </div>
                <div className="bg-surface-3 rounded-lg p-2">
                  <div className="font-sans text-[11px] text-ink-3">Incl.</div>
                  <div className="font-sans text-lg leading-none mt-0.5">{plan.includedCourts}</div>
                </div>
              </div>

              {plan.perExtraCourt > 0 && (
                <div className="mt-2 text-xs text-ink-3">+{'\u20B1'}{plan.perExtraCourt}/extra court</div>
              )}

              {plan.isActive && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeactivate(plan.id); }}
                    disabled={saving}
                    className="text-xs text-warn hover:underline"
                  >
                    Deactivate
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={() => setCreating(true)}
        className="w-full mt-4 bg-primary text-white py-3 rounded-xl text-sm font-medium"
      >
        Add Plan
      </button>
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
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans' | 'qr'>('tenants');

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

        {/* Tabs */}
        <div className="flex gap-6 border-b border-line mb-5">
          <button
            onClick={() => { setActiveTab('tenants'); setSelectedTenantId(null); }}
            className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'tenants' ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}
          >
            Tenants
          </button>
          <button
            onClick={() => { setActiveTab('plans'); setSelectedTenantId(null); }}
            className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'plans' ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}
          >
            Plans
          </button>
          <button
            onClick={() => { setActiveTab('qr'); setSelectedTenantId(null); }}
            className={`pb-2.5 text-sm font-medium transition-colors border-b-2 ${activeTab === 'qr' ? 'border-primary text-primary' : 'border-transparent text-ink-3 hover:text-ink'}`}
          >
            QR Code
          </button>
        </div>

        {activeTab === 'qr' ? (
          <QrCodeSection />
        ) : activeTab === 'plans' ? (
          <PlanManagement />
        ) : selectedTenantId ? (
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
                              {PLAN_TIER_LABELS[tenant.planTier] ?? tenant.planTier}
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
