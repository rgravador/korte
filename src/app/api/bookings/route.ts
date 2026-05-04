import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateBooking, dbUpdateBookingStatus, dbRescheduleBooking } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateBookingSchema, UpdateBookingStatusSchema, RescheduleBookingSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateBookingSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const booking = await dbCreateBooking(sb, { ...parsed.data, tenantId: session.tenantId });
    if (!booking) return serverError('Failed to create booking');
    return created(booking);
  } catch (err) {
    console.error('[api] POST /bookings error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();

    if (body.status) {
      const parsed = validateBody(UpdateBookingStatusSchema, body);
      if ('error' in parsed) return badRequest(parsed.error);

      const sb = getServerSupabase();
      const success = await dbUpdateBookingStatus(sb, parsed.data.bookingId, session.tenantId, parsed.data.status);
      if (!success) return serverError('Failed to update booking status');
      return ok({ bookingId: parsed.data.bookingId, status: parsed.data.status });
    }

    if (body.date && body.startHour !== undefined) {
      const parsed = validateBody(RescheduleBookingSchema, body);
      if ('error' in parsed) return badRequest(parsed.error);

      const sb = getServerSupabase();
      const success = await dbRescheduleBooking(sb, parsed.data.bookingId, session.tenantId, parsed.data.date, parsed.data.startHour);
      if (!success) return serverError('Failed to reschedule booking');
      return ok({ bookingId: parsed.data.bookingId, date: parsed.data.date, startHour: parsed.data.startHour });
    }

    return badRequest('Provide status or date+startHour');
  } catch (err) {
    console.error('[api] PATCH /bookings error:', err);
    return serverError();
  }
}
