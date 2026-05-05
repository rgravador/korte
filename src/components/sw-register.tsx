'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount.
 * Updates are applied silently — the next page load picks up the new SW.
 */
export function SwRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        console.debug('[sw] registered, scope:', reg.scope);

        // When a new SW is found, let it activate immediately
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'activated' && navigator.serviceWorker.controller) {
              console.debug('[sw] new version activated');
            }
          });
        });
      })
      .catch((err) => {
        console.warn('[sw] registration failed:', err);
      });
  }, []);

  return null;
}
