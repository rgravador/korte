'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { subscribeToBookings } from '@/lib/realtime';

/**
 * Manages online/offline status, realtime booking subscriptions,
 * and periodic data refresh for non-realtime data.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useStore((s) => s.setOnline);
  const currentUser = useStore((s) => s.currentUser);
  const isOnboarded = useStore((s) => s.isOnboarded);
  const refreshFromServer = useStore((s) => s.refreshFromServer);
  const unsubRef = useRef<(() => void) | null>(null);

  // Online/offline tracking
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    const handleOnline = () => {
      setOnline(true);
      // Refresh when coming back online
      refreshFromServer();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, refreshFromServer]);

  // Realtime booking subscription
  useEffect(() => {
    if (!currentUser || !isOnboarded || currentUser.role === 'system_admin') return;
    if (!currentUser.tenantId) return;

    // Debounce: don't refresh more than once every 2 seconds
    let lastRefresh = 0;
    const debouncedRefresh = () => {
      const now = Date.now();
      if (now - lastRefresh < 2000) return;
      lastRefresh = now;
      refreshFromServer();
    };

    unsubRef.current = subscribeToBookings(currentUser.tenantId, debouncedRefresh);

    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
    };
  }, [currentUser, isOnboarded, refreshFromServer]);

  // Periodic refresh for non-realtime data (courts, members, items) — every 5 minutes
  useEffect(() => {
    if (!currentUser || !isOnboarded || currentUser.role === 'system_admin') return;

    const interval = setInterval(() => {
      refreshFromServer();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser, isOnboarded, refreshFromServer]);

  // Refresh when tab becomes visible (user switches back to app)
  useEffect(() => {
    if (!currentUser || !isOnboarded) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshFromServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentUser, isOnboarded, refreshFromServer]);

  return <>{children}</>;
}
