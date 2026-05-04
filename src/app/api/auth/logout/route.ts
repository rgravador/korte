import { ok } from '@/lib/api-response';
import { clearSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = ok({ loggedOut: true });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
