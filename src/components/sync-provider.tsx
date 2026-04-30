'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

/**
 * Tracks online/offline status. Renders nothing — just side effects.
 * Hydration is now handled by login/onboarding pages via API routes.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useStore((s) => s.setOnline);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  return <>{children}</>;
}
