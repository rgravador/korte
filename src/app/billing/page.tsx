'use client';

import { AppShell } from '@/components/app-shell';
import { useStore } from '@/store';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiBillingAccount, BillingAccountData } from '@/lib/api';
import { toast } from '@/components/toast';
import Image from 'next/image';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-3 mb-2">{title}</div>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    trial: 'bg-amber-500/15 text-amber-400',
    active: 'bg-signal-soft text-signal-text',
    frozen: 'bg-red-500/15 text-red-400',
  };

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? 'bg-surface-3 text-ink-3'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PlanCard({ plan, isCurrentPlan }: { plan: BillingAccountData['planOptions'][number]; isCurrentPlan: boolean }) {
  return (
    <div
      className={`bg-surface rounded-xl shadow-card p-4 flex-1 min-w-[200px] border ${
        isCurrentPlan ? 'border-primary' : 'border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-lg text-ink">{plan.name}</h3>
        {isCurrentPlan && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary-deep">
            Current
          </span>
        )}
      </div>
      <div className="mb-4">
        <span className="font-display font-bold text-2xl text-ink">&#8369;{plan.price}</span>
        <span className="text-xs text-ink-3">/month</span>
      </div>
      <ul className="space-y-2">
        <li className="flex items-center gap-2 text-sm text-ink-2">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-signal shrink-0">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
          {plan.limits.sports} sport{plan.limits.sports !== 1 ? 's' : ''}
        </li>
        <li className="flex items-center gap-2 text-sm text-ink-2">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-signal shrink-0">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
          {plan.limits.courts} courts
        </li>
        <li className="flex items-center gap-2 text-sm text-ink-2">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-signal shrink-0">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
          {plan.limits.admins} admin{plan.limits.admins !== 1 ? 's' : ''}
        </li>
        <li className="flex items-center gap-2 text-sm text-ink-2">
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-signal shrink-0">
            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
          </svg>
          {plan.limits.staff} staff
        </li>
      </ul>
    </div>
  );
}

export default function BillingPage() {
  const { currentUser } = useStore();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingAccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrError, setQrError] = useState(false);

  // Redirect staff users to dashboard
  useEffect(() => {
    if (currentUser && currentUser.role !== 'tenant_admin') {
      toast.error('Only admins can access billing.');
      router.push('/dashboard');
    }
  }, [currentUser, router]);

  useEffect(() => {
    async function loadBilling() {
      const data = await apiBillingAccount();
      if (data) {
        setBilling(data);
      }
      setLoading(false);
    }
    if (currentUser?.role === 'tenant_admin') {
      loadBilling();
    }
  }, [currentUser]);

  if (!currentUser || currentUser.role !== 'tenant_admin') {
    return null;
  }

  if (loading) {
    return (
      <AppShell>
        <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5 text-ink">Billing</h1>
        <div className="bg-surface rounded-xl shadow-card p-6 animate-pulse">
          <div className="h-4 bg-surface-3 rounded w-1/3 mb-3" />
          <div className="h-4 bg-surface-3 rounded w-1/2" />
        </div>
      </AppShell>
    );
  }

  if (!billing) {
    return (
      <AppShell>
        <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5 text-ink">Billing</h1>
        <div className="bg-surface rounded-xl shadow-card p-6">
          <p className="text-sm text-ink-3">Unable to load billing information. Please try again later.</p>
        </div>
      </AppShell>
    );
  }

  const isFrozen = billing.subscriptionStatus === 'frozen'
    || (billing.subscriptionStatus === 'trial' && billing.trialStatus.isExpired)
    || (billing.subscriptionStatus === 'active' && billing.currentPeriodEnd && new Date(billing.currentPeriodEnd).getTime() < Date.now());
  const isTrial = billing.subscriptionStatus === 'trial' && !billing.trialStatus.isExpired;
  const isActive = billing.subscriptionStatus === 'active' && !isFrozen;

  const planTierLabel = billing.planTier
    ? billing.planTier.charAt(0).toUpperCase() + billing.planTier.slice(1)
    : null;

  return (
    <AppShell>
      <h1 className="font-display font-bold text-2xl md:text-3xl tracking-tight mb-5 md:mb-6 text-ink">Billing</h1>

      {/* Status card */}
      <Section title="Account status">
        <div className="bg-surface rounded-xl shadow-card p-4 space-y-3">
          {isFrozen && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3">
              <p className="text-sm font-medium text-red-400">
                Your account is frozen. Choose a plan and pay below to reactivate.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-2">Status</span>
            <StatusBadge status={isFrozen ? 'frozen' : billing.subscriptionStatus} />
          </div>

          {planTierLabel && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink-2">Plan</span>
              <span className="text-sm font-semibold text-ink">{planTierLabel}</span>
            </div>
          )}

          {isTrial && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-ink-2">Trial days remaining</span>
                <span className="text-sm font-semibold text-amber-400">{billing.trialStatus.daysRemaining}</span>
              </div>
              {billing.trialEndsAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Trial ends</span>
                  <span className="text-sm text-ink">{new Date(billing.trialEndsAt).toLocaleDateString()}</span>
                </div>
              )}
            </>
          )}

          {isActive && (
            <>
              {billing.currentPeriodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Next billing date</span>
                  <span className="text-sm text-ink">{new Date(billing.currentPeriodEnd).toLocaleDateString()}</span>
                </div>
              )}
              {billing.planTier && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2">Amount due</span>
                  <span className="text-sm font-semibold text-ink">
                    &#8369;{billing.planTier === 'pro' ? '999' : '499'}/mo
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </Section>

      {/* Plan comparison */}
      <Section title="Plans">
        <div className="flex flex-col sm:flex-row gap-3">
          {billing.planOptions.map((plan) => (
            <PlanCard
              key={plan.tier}
              plan={plan}
              isCurrentPlan={billing.planTier === plan.tier}
            />
          ))}
        </div>
        <p className="text-xs text-ink-3 mt-2">
          Need more? Contact us for a custom Max plan with higher limits.
        </p>
      </Section>

      {/* QR PH payment */}
      <Section title="Payment">
        <div className="bg-surface rounded-xl shadow-card p-4 space-y-4">
          <p className="text-sm text-ink-2">
            Pay via GCash, Maya, or any QR PH-enabled bank app
          </p>

          <div className="flex justify-center">
            {qrError ? (
              <div className="w-48 h-48 rounded-xl bg-surface-3 border border-line flex items-center justify-center">
                <p className="text-xs text-ink-3 text-center px-4">QR code not yet available. Contact Korte for payment details.</p>
              </div>
            ) : (
              <Image
                src="/qr-ph.png"
                alt="QR PH payment code"
                width={192}
                height={192}
                className="rounded-xl border border-line"
                onError={() => setQrError(true)}
              />
            )}
          </div>

          <div className="rounded-lg bg-primary-soft/30 border border-primary/20 px-4 py-3">
            <p className="text-sm text-ink-2">
              After payment, contact Korte to activate your subscription.
            </p>
          </div>
        </div>
      </Section>
    </AppShell>
  );
}
