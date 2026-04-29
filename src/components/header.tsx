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
        <div className="font-display font-normal italic text-lg tracking-tight">
          Court<span className="text-accent-deep not-italic">.</span>
        </div>
        {/* Online/offline indicator */}
        {!isOnline && (
          <span className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#F4E1D8] text-[#8A4A2D]">
            Offline
          </span>
        )}
        {isOnline && pendingSync > 0 && (
          <span className="font-mono text-[8px] tracking-wider uppercase px-1.5 py-0.5 rounded bg-accent-soft text-[#6F5A1A]">
            Syncing {pendingSync}
          </span>
        )}
      </div>
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="w-7 h-7 rounded-full bg-ink text-paper flex items-center justify-center font-mono text-[10px] font-medium"
        >
          {initials}
        </button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
            <div className="absolute right-0 top-9 bg-paper rounded-card border border-line shadow-lg z-50 w-48 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-line-2">
                <div className="font-medium text-xs">{currentUser?.displayName}</div>
                <div className="font-mono text-[8px] text-ink-3 tracking-wider uppercase">{currentUser?.role.replace('_', ' ')}</div>
              </div>
              <div className="px-3 py-2 border-b border-line-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-signal' : 'bg-warn'}`} />
                <span className="font-mono text-[8px] text-ink-3 tracking-wider uppercase">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full px-3 py-2.5 text-left text-xs text-warn hover:bg-paper-2"
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
