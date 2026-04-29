'use client';

import { useEffect, useRef } from 'react';
import { useStore } from '@/store';
import {
  getOnlineStatus,
  onOnlineChange,
  flushQueue,
  getQueue,
  hydrateFromSupabase,
  isSupabaseConfigured,
} from '@/lib/sync';

/**
 * Manages online/offline detection, Supabase hydration, and queue flushing.
 * Renders nothing — just side effects.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const setOnline = useStore((s) => s.setOnline);
  const setPendingSync = useStore((s) => s.setPendingSync);
  const setLastSynced = useStore((s) => s.setLastSynced);
  const hydrateFromRemote = useStore((s) => s.hydrateFromRemote);
  const tenant = useStore((s) => s.tenant);
  const isOnboarded = useStore((s) => s.isOnboarded);
  const currentUser = useStore((s) => s.currentUser);
  const didHydrate = useRef(false);

  // Track online status
  useEffect(() => {
    setOnline(getOnlineStatus());
    return onOnlineChange((online) => {
      setOnline(online);
      if (online) {
        // Flush queued mutations when back online
        flushQueue(tenant.id).then(({ flushed }) => {
          if (flushed > 0) {
            setLastSynced(new Date().toISOString());
          }
          setPendingSync(getQueue().length);
        });
      }
    });
  }, [setOnline, setPendingSync, setLastSynced]);

  // Update pending count periodically
  useEffect(() => {
    setPendingSync(getQueue().length);
  });

  // Hydrate from Supabase on mount (once) if online + configured + logged in
  useEffect(() => {
    if (didHydrate.current) return;
    if (!isSupabaseConfigured() || !isOnboarded || !currentUser) return;
    if (!getOnlineStatus()) return;

    // Validate tenant ownership: user must belong to the tenant being hydrated
    const hydrateTenantId = currentUser.tenantId || tenant.id;
    if (currentUser.tenantId && currentUser.tenantId !== tenant.id) {
      // User belongs to a different tenant — hydrate their tenant instead
      didHydrate.current = true;
      hydrateFromSupabase(currentUser.tenantId).then((data) => {
        if (data) {
          hydrateFromRemote(data);
          setPendingSync(0);
        }
      });
      return;
    }

    didHydrate.current = true;

    hydrateFromSupabase(hydrateTenantId).then((data) => {
      if (data) {
        hydrateFromRemote(data);
        setPendingSync(0);
      }
    });
  }, [isOnboarded, currentUser, tenant.id, hydrateFromRemote, setPendingSync]);

  return <>{children}</>;
}
