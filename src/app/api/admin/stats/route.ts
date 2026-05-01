import { getServerSupabase } from '@/lib/supabase-server';
import { ok, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sb = getServerSupabase();

    // Total tenants (exclude system)
    const { count: tenantCount } = await sb
      .from('tenants')
      .select('*', { count: 'exact', head: true })
      .neq('subdomain', 'system');

    // Total bookings
    const { count: bookingCount } = await sb
      .from('bookings')
      .select('*', { count: 'exact', head: true });

    // Total members
    const { count: memberCount } = await sb
      .from('members')
      .select('*', { count: 'exact', head: true });

    // Total users (exclude system tenant)
    const { count: userCount } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('tenant_id', '00000000-0000-0000-0000-000000000001');

    // Bookings by status
    const { data: statusRows } = await sb
      .from('bookings')
      .select('status');

    const byStatus: Record<string, number> = {};
    for (const row of statusRows ?? []) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    }

    // Bookings per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentBookings } = await sb
      .from('bookings')
      .select('date')
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

    const byDay: Record<string, number> = {};
    for (const row of recentBookings ?? []) {
      byDay[row.date] = (byDay[row.date] ?? 0) + 1;
    }

    // Tenants created per month (last 6 months)
    const { data: tenantDates } = await sb
      .from('tenants')
      .select('created_at')
      .neq('subdomain', 'system');

    const byMonth: Record<string, number> = {};
    for (const row of tenantDates ?? []) {
      const month = (row.created_at as string).slice(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] ?? 0) + 1;
    }

    return ok({
      totals: {
        tenants: tenantCount ?? 0,
        bookings: bookingCount ?? 0,
        members: memberCount ?? 0,
        users: userCount ?? 0,
      },
      bookingsByStatus: byStatus,
      bookingsByDay: byDay,
      tenantsByMonth: byMonth,
    });
  } catch (err) {
    console.error('[api] GET /admin/stats error:', err);
    return serverError();
  }
}
