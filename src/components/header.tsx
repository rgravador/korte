'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

export function Header() {
  const { currentUser, logout, isOnline, pendingSync } = useStore();
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

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className="flex justify-between items-center mb-5">
      <div className="flex items-center gap-2.5">
        <Image src="/logos/Korte-no-bg.png" alt="Korte" width={32} height={32} className="w-8 h-8" />
        <span className="font-display font-semibold text-base tracking-tight text-ink">
          Korte
        </span>
        {!isOnline && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-warn-soft text-warn-text">
            Offline
          </span>
        )}
        {isOnline && pendingSync > 0 && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary-soft text-primary-deep">
            Syncing {pendingSync}
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="User menu"
          className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-semibold"
        >
          {initials}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div role="menu" className="absolute right-0 top-10 bg-surface rounded-xl border border-line shadow-dropdown z-50 w-52 overflow-hidden">
              <div className="px-3.5 py-3 border-b border-line-2">
                <div className="font-display font-semibold text-sm text-ink">{currentUser?.displayName}</div>
                <div className="text-xs text-ink-3 mt-0.5 capitalize">{currentUser?.role.replace('_', ' ')}</div>
              </div>
              <div className="px-3.5 py-2.5 border-b border-line-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-signal' : 'bg-warn'}`} />
                <span className="text-xs text-ink-3">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="w-full px-3.5 py-2.5 text-left text-xs text-warn font-medium hover:bg-surface-2 transition-colors"
              >
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
