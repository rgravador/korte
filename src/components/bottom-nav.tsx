'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import { UserRole } from '@/lib/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[]; // which roles can see this item
}

const ALL_ROLES: UserRole[] = ['system_admin', 'tenant_admin', 'tenant_staff'];

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Today',
    href: '/',
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
    label: 'Members',
    href: '/members',
    roles: ['system_admin', 'tenant_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
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
    label: 'More',
    href: '/settings',
    roles: ['system_admin', 'tenant_admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
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

export function BottomNav() {
  const pathname = usePathname();
  const currentUser = useStore((s) => s.currentUser);
  const role = currentUser?.role ?? 'tenant_admin';

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const colCount = visibleItems.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 h-16 bg-paper border-t border-line items-center z-50 max-w-lg mx-auto grid"
      style={{ gridTemplateColumns: `repeat(${colCount}, 1fr)` }}
    >
      {visibleItems.map((item) => {
        const isActive = item.href === '/'
          ? pathname === '/'
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 relative ${
              isActive ? 'text-ink' : 'text-ink-3'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-7 h-0.5 bg-accent" />
            )}
            {item.icon}
            <span className="font-mono text-[8px] tracking-wider uppercase">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
