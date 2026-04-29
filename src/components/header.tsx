'use client';

import { useStore } from '@/store';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function Header() {
  const { currentUser, logout } = useStore();
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
    router.push('/login');
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="font-display font-normal italic text-lg tracking-tight">
        Court<span className="text-accent-deep not-italic">.</span>
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
