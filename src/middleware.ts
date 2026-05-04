import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySession, COOKIE_NAME } from '@/lib/auth';
import { dbGetTenantSubscriptionStatus } from '@/lib/db-subscription';

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

// ── Freeze-exempt routes (prefix/exact match) ──────────────
function isFreezeExempt(pathname: string): boolean {
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname === '/api/hydrate') return true;
  if (pathname.startsWith('/api/billing/')) return true;
  if (pathname === '/api/plans') return true;
  return false;
}

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

  // ── Freeze enforcement (read-only — no DB writes) ─────────
  let planTier: string | null = null;
  const isWriteMethod = req.method !== 'GET';

  if (!isFreezeExempt(pathname) && isWriteMethod) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && supabaseKey) {
      const sb = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const sub = await dbGetTenantSubscriptionStatus(sb, session.tenantId);

      if (sub) {
        planTier = sub.planTier;

        if (!sub.adminOverride) {
          const now = Date.now();

          if (sub.subscriptionStatus === 'frozen') {
            return jsonResponse(403, {
              data: null,
              error: {
                code: 'TENANT_FROZEN',
                message: 'Your account is frozen. Please renew your subscription to continue.',
              },
            });
          }

          if (sub.subscriptionStatus === 'trial' && sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() < now) {
            return jsonResponse(403, {
              data: null,
              error: {
                code: 'TENANT_FROZEN',
                message: 'Your trial has expired. Please subscribe to continue.',
              },
            });
          }

          if (sub.subscriptionStatus === 'active' && sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() < now) {
            return jsonResponse(403, {
              data: null,
              error: {
                code: 'TENANT_FROZEN',
                message: 'Your subscription has lapsed. Please renew to continue.',
              },
            });
          }
        }
      }
    }
  }

  // Inject session into request headers for route handlers
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-user-id', session.userId);
  requestHeaders.set('x-tenant-id', session.tenantId);
  requestHeaders.set('x-user-role', session.role);
  if (planTier) {
    requestHeaders.set('x-plan-tier', planTier);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}
