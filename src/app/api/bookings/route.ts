import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateBooking, dbUpdateBookingStatus, dbRescheduleBooking } from '@/lib/db';
import { created, badRequest, serverError } from '@/lib/api-response';
import { ok } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();
    const booking = await dbCreateBooking(sb, body);
    if (!booking) return serverError('Failed to create booking');
    return created(booking);
  } catch (err) {
    console.error('[api] POST /bookings error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { bookingId, status, date, startHour } = await req.json();
    if (!bookingId) return badRequest('bookingId required');

    const sb = getServerSupabase();

    if (status) {
      const success = await dbUpdateBookingStatus(sb, bookingId, status);
      if (!success) return serverError('Failed to update booking status');
      return ok({ bookingId, status });
    }

    if (date && startHour !== undefined) {
      const success = await dbRescheduleBooking(sb, bookingId, date, startHour);
      if (!success) return serverError('Failed to reschedule booking');
      return ok({ bookingId, date, startHour });
    }

    return badRequest('Provide status or date+startHour');
  } catch (err) {
    console.error('[api] PATCH /bookings error:', err);
    return serverError();
  }
}
