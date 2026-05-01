import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddItem, dbUpdateItem, dbRemoveItem } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sb = getServerSupabase();
    const item = await dbAddItem(sb, body);
    if (!item) return serverError('Failed to create item');
    return created(item);
  } catch (err) {
    console.error('[api] POST /items error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { itemId, ...updates } = await req.json();
    if (!itemId) return badRequest('itemId required');

    const sb = getServerSupabase();
    const success = await dbUpdateItem(sb, itemId, updates);
    if (!success) return serverError('Failed to update item');
    return ok({ itemId });
  } catch (err) {
    console.error('[api] PATCH /items error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { itemId } = await req.json();
    if (!itemId) return badRequest('itemId required');

    const sb = getServerSupabase();
    const success = await dbRemoveItem(sb, itemId);
    if (!success) return serverError('Failed to delete item');
    return ok({ itemId });
  } catch (err) {
    console.error('[api] DELETE /items error:', err);
    return serverError();
  }
}
