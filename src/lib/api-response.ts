import { NextResponse } from 'next/server';

export function ok<T>(data: T) {
  return NextResponse.json({ data, error: null });
}

export function created<T>(data: T) {
  return NextResponse.json({ data, error: null }, { status: 201 });
}

export function badRequest(message: string) {
  return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message } }, { status: 400 });
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ data: null, error: { code: 'UNAUTHORIZED', message } }, { status: 401 });
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message } }, { status: 403 });
}

export function tenantFrozen(message = 'Your account is frozen. Please renew your subscription to continue.') {
  return NextResponse.json({ data: null, error: { code: 'TENANT_FROZEN', message } }, { status: 403 });
}

export function planLimitExceeded(message: string) {
  return NextResponse.json({ data: null, error: { code: 'PLAN_LIMIT_EXCEEDED', message } }, { status: 403 });
}

export function serverError(message = 'Internal server error') {
  return NextResponse.json({ data: null, error: { code: 'SERVER_ERROR', message } }, { status: 500 });
}
