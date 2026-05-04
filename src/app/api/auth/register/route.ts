import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateTenant, dbCreateUser, dbAddCourt, dbAddSport } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { TimeRange } from '@/lib/types';
import { signSession, createSessionCookie } from '@/lib/auth';
import { RegisterSchema, validateBody } from '@/lib/validation';
import { dbGetPlanBySlug } from '@/lib/db-subscription';

export const dynamic = 'force-dynamic';

interface SportInput {
  name: string;
  operatingHoursRanges: TimeRange[];
  courts: { name: string; hourlyRate: number }[];
}

// Fallback Pro limits if the plan row is missing from DB
const FALLBACK_MAX_SPORTS = 3;
const FALLBACK_MAX_COURTS = 20;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = validateBody(RegisterSchema, body);
    if ('error' in parsed) return badRequest(parsed.error);

    const { name, subdomain, operatingHoursStart, operatingHoursEnd, ownerName, ownerEmail, ownerUsername, ownerPassword, sports, courts } = parsed.data;

    const sb = getServerSupabase();

    // Look up Pro plan limits from DB (trial operates under Pro limits)
    const proPlan = await dbGetPlanBySlug(sb, 'pro');
    const maxSports = proPlan?.maxSports ?? FALLBACK_MAX_SPORTS;
    const maxCourts = proPlan?.maxCourts ?? FALLBACK_MAX_COURTS;

    if (sports && sports.length > maxSports) {
      return badRequest(`Cannot create more than ${maxSports} sports during registration`);
    }

    const totalCourts = sports
      ? (sports as SportInput[]).reduce((sum, s) => sum + (s.courts?.length ?? 0), 0)
      : (courts?.length ?? 0);
    if (maxCourts > 0 && totalCourts > maxCourts) {
      return badRequest(`Cannot create more than ${maxCourts} courts during registration`);
    }

    // 1. Create tenant — auto-suffix subdomain if taken
    let finalSubdomain = subdomain;
    let tenant = await dbCreateTenant(sb, { name, subdomain: finalSubdomain, operatingHoursStart: operatingHoursStart ?? 6, operatingHoursEnd: operatingHoursEnd ?? 22 });
    if (!tenant) {
      // Likely unique constraint on subdomain — retry with random suffix
      const suffix = Math.random().toString(36).slice(2, 5);
      finalSubdomain = `${subdomain}-${suffix}`;
      tenant = await dbCreateTenant(sb, { name, subdomain: finalSubdomain, operatingHoursStart: operatingHoursStart ?? 6, operatingHoursEnd: operatingHoursEnd ?? 22 });
      if (!tenant) return serverError('Failed to create tenant');
    }

    // 2. Create admin user
    const user = await dbCreateUser(sb, tenant.id, {
      username: ownerUsername,
      password: ownerPassword,
      role: 'tenant_admin',
      displayName: ownerName,
      email: ownerEmail,
    });
    if (!user) return serverError('Failed to create admin user');

    // 3. Create sports and their courts
    const createdSports = [];
    const createdCourts = [];

    if (sports && sports.length > 0) {
      for (const sportInput of sports as SportInput[]) {
        const sport = await dbAddSport(sb, {
          tenantId: tenant.id,
          name: sportInput.name,
          operatingHoursRanges: sportInput.operatingHoursRanges ?? [],
        });
        if (sport) {
          createdSports.push(sport);
          for (const c of sportInput.courts ?? []) {
            const court = await dbAddCourt(sb, { tenantId: tenant.id, sportId: sport.id, name: c.name, hourlyRate: c.hourlyRate });
            if (court) createdCourts.push(court);
          }
        }
      }
    } else if (courts && courts.length > 0) {
      const defaultSport = await dbAddSport(sb, {
        tenantId: tenant.id,
        name: 'Pickleball',
        operatingHoursRanges: operatingHoursStart != null && operatingHoursEnd != null
          ? [{ start: operatingHoursStart, end: operatingHoursEnd }]
          : [],
      });
      if (defaultSport) {
        createdSports.push(defaultSport);
        for (const c of courts) {
          const court = await dbAddCourt(sb, { tenantId: tenant.id, sportId: defaultSport.id, name: c.name, hourlyRate: c.hourlyRate });
          if (court) createdCourts.push(court);
        }
      }
    }

    // 4. Sign session cookie
    const token = await signSession({ userId: user.id, tenantId: tenant.id, role: 'tenant_admin' });
    const response = ok({ tenant, user, sports: createdSports, courts: createdCourts });
    response.headers.set('Set-Cookie', createSessionCookie(token));
    return response;
  } catch (err) {
    console.error('[api] POST /auth/register error:', err);
    return serverError();
  }
}
