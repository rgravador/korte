'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <div className="font-sans font-semibold text-lg tracking-tight">
          Court<span className="text-primary">.</span>
        </div>
        {/* Online/offline indicator */}
        {!isOnline && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-tag bg-warn-soft text-warn-text">
            Offline
          </span>
        )}
        {isOnline && pendingSync > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-tag bg-primary-soft text-primary-deep">
            Syncing {pendingSync}
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          aria-label="User menu"
          className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-sans text-[10px] font-medium"
        >
          {initials}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div role="menu" className="absolute right-0 top-9 bg-white rounded-[16px] border border-line shadow-dropdown z-50 w-48 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-line-2">
                <div className="font-medium text-xs">{currentUser?.displayName}</div>
                <div className="text-xs text-ink-3">{currentUser?.role.replace('_', ' ')}</div>
              </div>
              <div className="px-3 py-2 border-b border-line-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-signal' : 'bg-warn'}`} />
                <span className="text-xs text-ink-3">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Sign out"
                className="w-full px-3 py-2.5 text-left text-xs text-warn hover:bg-surface-3"
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
