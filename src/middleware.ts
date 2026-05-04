import { NextRequest, NextResponse } from 'next/server';
import { verifySession, COOKIE_NAME } from '@/lib/auth';

export const config = {
  matcher: ['/api/:path*'],
};

// ── Rate limiter (in-memory, best-effort) ───────────────────
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_MAX_ATTEMPTS = 10;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > LOGIN_MAX_ATTEMPTS;
}

// ── Security headers ────────────────────────────────────────
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

function jsonResponse(status: number, body: { data: null; error: { code: string; message: string } }) {
  const res = NextResponse.json(body, { status });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

// ── Public routes (no auth required) ────────────────────────
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limit login
  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.ip || 'unknown';
    if (isRateLimited(ip)) {
      return jsonResponse(429, {
        data: null,
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' },
      });
    }
  }

  // Skip auth for public routes
  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    const res = NextResponse.next();
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
      res.headers.set(key, value);
    }
    return res;
  }

  // Validate JWT
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return jsonResponse(401, {
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const session = await verifySession(token);
  if (!session) {
    return jsonResponse(401, {
      data: null,
      error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' },
    });
  }

  // Admin route guard
  if (pathname.startsWith('/api/admin') && session.role !== 'system_admin') {
    return jsonResponse(403, {
      data: null,
      error: { code: 'FORBIDDEN', message: 'Admin access required' },
    });
  }

  // Inject session into request headers for route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-tenant-id', session.tenantId);
  requestHeaders.set('x-user-role', session.role);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
