import { createClient, RealtimeChannel } from '@supabase/supabase-js';

let _realtimeClient: ReturnType<typeof createClient> | null = null;

function getRealtimeClient() {
  if (_realtimeClient) return _realtimeClient;

  const url = process.env.SUPABASE_URL ?? '';
  const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !anonKey) return null;

  _realtimeClient = createClient(url, anonKey, {
    realtime: { params: { eventsPerSecond: 10 } },
  });

  return _realtimeClient;
}

export type RealtimeCallback = () => void;

/**
 * Subscribe to realtime changes on the bookings table for a specific tenant.
 * Calls `onChange` whenever a booking is inserted, updated, or deleted.
 * Returns an unsubscribe function.
 */
export function subscribeToBookings(tenantId: string, onChange: RealtimeCallback): (() => void) {
  const client = getRealtimeClient();
  if (!client) {
    console.warn('[realtime] Supabase not configured, skipping subscription');
    return () => {};
  }

  console.debug('[realtime] subscribing to bookings for tenant:', tenantId);

  const channel: RealtimeChannel = client
    .channel(`bookings:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bookings',
        filter: `tenant_id=eq.${tenantId}`,
      },
      (payload) => {
        console.debug('[realtime] booking change:', payload.eventType, payload.new);
        onChange();
      }
    )
    .subscribe((status) => {
      console.debug('[realtime] subscription status:', status);
    });

  return () => {
    console.debug('[realtime] unsubscribing from bookings');
    client.removeChannel(channel);
  };
}
