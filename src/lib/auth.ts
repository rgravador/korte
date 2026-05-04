import { SignJWT, jwtVerify } from 'jose';
import { NextRequest } from 'next/server';
import { UserRole } from './types';

export const COOKIE_NAME = 'korte-session';
const SESSION_EXPIRY = '24h';

export interface SessionPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return {
      userId: payload.userId as string,
      tenantId: payload.tenantId as string,
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

export async function getSession(req: NextRequest): Promise<SessionPayload | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function getSessionFromHeaders(req: NextRequest): SessionPayload {
  return {
    userId: req.headers.get('x-user-id') ?? '',
    tenantId: req.headers.get('x-tenant-id') ?? '',
    role: (req.headers.get('x-user-role') ?? 'tenant_staff') as UserRole,
  };
}

export function createSessionCookie(token: string): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE_NAME}=${token}; HttpOnly${secure}; SameSite=Lax; Path=/; Max-Age=86400`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
}
