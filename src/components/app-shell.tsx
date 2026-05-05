'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useStore } from '@/store';
import { useState } from 'react';
import { UserRole } from '@/lib/types';
import { getTrialStatus, isTenantFrozen } from '@/lib/subscription';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const ALL_ROLES: UserRole[] = ['system_admin', 'tenant_admin', 'tenant_staff'];

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Today',
    href: '/dashboard',
    roles: ALL_ROLES,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    ),
  },
  {
    label: 'Schedule',
    href: '/schedule',
    roles: ALL_ROLES,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 10h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    href: '/reports',
    roles: ['system_admin', 'tenant_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <path d="M3 20V8M9 20V4M15 20v-9M21 20v-5" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    roles: ['system_admin', 'tenant_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    label: 'Check-in',
    href: '/checkin',
    roles: ['tenant_staff'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
];

function UserMenu() {
  const { currentUser, logout, isOnline } = useStore();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  const initials = currentUser
    ? currentUser.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        aria-label="User menu"
        className="w-8 h-8 rounded-full bg-navy-700 text-gold flex items-center justify-center text-xs font-semibold"
      >
        {initials}
      </button>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div role="menu" className="absolute right-0 lg:left-0 lg:right-auto lg:bottom-full lg:mb-2 top-10 lg:top-auto bg-surface rounded-xl border border-line shadow-dropdown z-50 w-52 overflow-hidden">
            <div className="px-3.5 py-3 border-b border-line-2">
              <div className="font-display font-semibold text-base text-ink">{currentUser?.displayName}</div>
              <div className="text-sm text-ink-3 mt-0.5 capitalize">{currentUser?.role.replace('_', ' ')}</div>
            </div>
            <div className="px-3.5 py-2.5 border-b border-line-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-signal' : 'bg-warn'}`} />
              <span className="text-sm text-ink-3">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              aria-label="Sign out"
              className="w-full px-3.5 py-2.5 text-left text-sm text-warn font-medium hover:bg-surface-2 transition-colors"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Desktop Sidebar ── */
function Sidebar() {
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const { isOnline, pendingSync } = useStore();
  const role = currentUser?.role ?? 'tenant_admin';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-navy-800 z-40 flex flex-col">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <Image src="/korte/Korte-no-bg.png" alt="Korte" width={36} height={36} className="w-9 h-9" />
          <div>
            <span className="font-display font-semibold text-base tracking-tight text-white block leading-tight">Korte</span>
            {!isOnline && (
              <span className="text-[9px] font-medium text-warn">Offline</span>
            )}
            {isOnline && pendingSync > 0 && (
              <span className="text-[9px] font-medium text-gold">Syncing {pendingSync}</span>
            )}
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5" aria-label="Main navigation">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gold/15 text-gold'
                  : 'text-white/50 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-white/10 flex items-center gap-3">
        <UserMenu />
        <div className="min-w-0">
          <div className="text-sm font-medium text-white truncate">{currentUser?.displayName}</div>
          <div className="text-xs text-white/40 capitalize truncate">{currentUser?.role.replace('_', ' ')}</div>
        </div>
      </div>
    </aside>
  );
}

/* ── Refresh Button ── */
function RefreshButton() {
  const refreshFromServer = useStore((s) => s.refreshFromServer);
  const lastSyncedAt = useStore((s) => s.lastSyncedAt);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshFromServer();
    setRefreshing(false);
  };

  const lastSyncLabel = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="flex items-center gap-1.5 text-ink-3 hover:text-ink-2 transition-colors"
      aria-label="Refresh data"
      title={lastSyncLabel ? `Last synced: ${lastSyncLabel}` : 'Refresh data'}
    >
      <svg
        className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" strokeLinecap="round" />
        <path d="M12 1v3.5h-3.5M4 15v-3.5h3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {lastSyncLabel && (
        <span className="text-xs font-medium">{lastSyncLabel}</span>
      )}
    </button>
  );
}

/* ── Mobile Header ── */
function MobileHeader() {
  const { isOnline, pendingSync } = useStore();

  return (
    <div className="flex justify-between items-center mb-5 lg:hidden">
      <div className="flex items-center gap-2.5">
        <Image src="/korte/Korte-no-bg.png" alt="Korte" width={32} height={32} className="w-8 h-8" />
        <span className="font-display font-semibold text-base tracking-tight text-ink">
          Korte
        </span>
        {!isOnline && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-warn-soft text-warn-text">
            Offline
          </span>
        )}
        {isOnline && pendingSync > 0 && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary-deep">
            Syncing {pendingSync}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <RefreshButton />
        <UserMenu />
      </div>
    </div>
  );
}

/* ── Mobile Bottom Nav ── */
function MobileBottomNav() {
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const role = currentUser?.role ?? 'tenant_admin';
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const colCount = visibleItems.length;

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 h-[72px] bg-surface border-t border-line shadow-[0_-2px_10px_rgba(0,0,0,0.3)] z-50 grid items-center lg:hidden pb-safe"
      style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
    >
      {visibleItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center gap-1 py-2 transition-colors ${
              isActive ? 'text-primary-deep' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {item.icon}
            <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ── Subscription Banner ── */
function SubscriptionBanner() {
  const tenant = useStore((s) => s.tenant);
  const currentUser = useStore((s) => s.currentUser);

  if (!currentUser || !tenant.id) return null;

  const isAdmin = currentUser.role === 'tenant_admin' || currentUser.role === 'system_admin';
  const isFrozen = isTenantFrozen(
    tenant.subscriptionStatus,
    tenant.trialEndsAt,
    tenant.currentPeriodEnd,
  );
  const trialStatus = getTrialStatus(tenant.trialEndsAt);
  const isTrialWarning = tenant.subscriptionStatus === 'trial' && trialStatus.isWarning;

  if (isFrozen) {
    return (
      <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 mb-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-red-300">
            {isAdmin ? (
              <>
                Your account is frozen &mdash;{' '}
                <Link href="/billing" className="underline underline-offset-2 hover:text-red-200 transition-colors">
                  View billing
                </Link>
              </>
            ) : (
              'Your account is frozen — contact your admin'
            )}
          </p>
        </div>
      </div>
    );
  }

  if (isTrialWarning) {
    const warningText = trialStatus.daysRemaining === 0
      ? 'Trial expires today'
      : `Your trial ends in ${trialStatus.daysRemaining} day${trialStatus.daysRemaining === 1 ? '' : 's'}`;

    return (
      <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 mb-5">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 shrink-0">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium text-amber-300">
            {warningText}
            {isAdmin && (
              <>
                {' — '}
                <Link href="/billing" className="underline underline-offset-2 hover:text-amber-200 transition-colors">
                  Upgrade
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    );
  }

  return null;
}

/* ── App Shell ── */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Desktop sidebar — hidden on mobile/tablet */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Main content area — shifts right on desktop for sidebar */}
      <div className="min-h-screen bg-surface-2 lg:pl-56">
        <div className="w-full max-w-lg md:max-w-2xl lg:max-w-6xl mx-auto">
          <div className="px-5 md:px-8 lg:px-8 pt-4 md:pt-6 pb-24 lg:pb-8">
            <MobileHeader />
            <SubscriptionBanner />
            {children}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileBottomNav />
    </>
  );
}
