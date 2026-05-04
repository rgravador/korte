import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbAddItem, dbUpdateItem, dbRemoveItem } from '@/lib/db';
import { created, ok, badRequest, serverError } from '@/lib/api-response';
import { getSessionFromHeaders } from '@/lib/auth';
import { CreateItemSchema, UpdateItemSchema, DeleteItemSchema, validateBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(CreateItemSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const item = await dbAddItem(sb, { tenantId: session.tenantId, ...parsed.data });
    if (!item) return serverError('Failed to create item');
    return created(item);
  } catch (err) {
    console.error('[api] POST /items error:', err);
    return serverError();
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(UpdateItemSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { itemId, ...updates } = parsed.data;
    const sb = getServerSupabase();
    const success = await dbUpdateItem(sb, itemId, session.tenantId, updates);
    if (!success) return serverError('Failed to update item');
    return ok({ itemId });
  } catch (err) {
    console.error('[api] PATCH /items error:', err);
    return serverError();
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSessionFromHeaders(req);
    const body = await req.json();
    const parsed = validateBody(DeleteItemSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const sb = getServerSupabase();
    const success = await dbRemoveItem(sb, parsed.data.itemId, session.tenantId);
    if (!success) return serverError('Failed to delete item');
    return ok({ itemId: parsed.data.itemId });
  } catch (err) {
    console.error('[api] DELETE /items error:', err);
    return serverError();
  }
}
