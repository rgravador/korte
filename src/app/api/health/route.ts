import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Temporary debug endpoint — reports whether required env vars are set.
 * DELETE THIS after debugging is complete.
 */
export async function GET() {
  const vars = {
    SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    NODE_ENV: process.env.NODE_ENV ?? 'undefined',
  };

  const allSet = vars.SUPABASE_URL === 'SET'
    && vars.SUPABASE_SERVICE_ROLE_KEY === 'SET'
    && vars.JWT_SECRET === 'SET';

  return NextResponse.json({ healthy: allSet, vars });
}
