'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import { subscribeToBookings } from '@/lib/realtime';
import { flushQueue } from '@/lib/sync';
import { toast } from '@/components/toast';

/**
 * Manages online/offline status, realtime booking subscriptions,
 * offline queue flush on reconnect, and periodic data refresh.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useStore((s) => s.setOnline);
  const setPendingSync = useStore((s) => s.setPendingSync);
  const currentUser = useStore((s) => s.currentUser);
  const isOnboarded = useStore((s) => s.isOnboarded);
  const refreshFromServer = useStore((s) => s.refreshFromServer);
  const unsubRef = useRef<(() => void) | null>(null);

  // Online/offline tracking + queue flush on reconnect
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setOnline(navigator.onLine);
    }
    const handleOnline = async () => {
      setOnline(true);
      // Flush pending offline mutations before refreshing
      const { flushed, failed } = await flushQueue();
      if (flushed > 0 || failed > 0) {
        setPendingSync(0);
        if (failed > 0) {
          toast.error(`Synced ${flushed} changes, but ${failed} failed. Data has been refreshed from the server.`);
        } else {
          toast.success(`${flushed} offline change${flushed === 1 ? '' : 's'} synced.`);
        }
      }
      refreshFromServer();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, setPendingSync, refreshFromServer]);

  // Flush any pending mutations left from a prior offline session on app start
  useEffect(() => {
    if (!currentUser || !isOnboarded) return;
    (async () => {
      const { flushed, failed } = await flushQueue();
      if (flushed > 0 || failed > 0) {
        setPendingSync(0);
        if (failed > 0) {
          toast.error(`Synced ${flushed} changes, but ${failed} failed.`);
        } else {
          toast.success(`${flushed} offline change${flushed === 1 ? '' : 's'} synced.`);
        }
        refreshFromServer();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

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
      if (navigator.onLine) refreshFromServer();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentUser, isOnboarded, refreshFromServer]);

  // Refresh when tab becomes visible (user switches back to app)
  useEffect(() => {
    if (!currentUser || !isOnboarded) return;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        refreshFromServer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [currentUser, isOnboarded, refreshFromServer]);

  return <>{children}</>;
}
