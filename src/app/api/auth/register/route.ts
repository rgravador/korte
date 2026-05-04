import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { dbCreateTenant, dbCreateUser, dbAddCourt, dbAddItem, dbAddSport } from '@/lib/db';
import { ok, badRequest, serverError } from '@/lib/api-response';
import { ItemType, TimeRange } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface SportInput {
  name: string;
  operatingHoursRanges: TimeRange[];
  courts: { name: string; hourlyRate: number }[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, subdomain, operatingHoursStart, operatingHoursEnd, ownerName, ownerEmail, ownerUsername, ownerPassword, sports, courts, items } = body;

    if (!name || !subdomain || !ownerUsername || !ownerPassword) {
      return badRequest('Missing required fields');
    }

    const sb = getServerSupabase();

    // 1. Create tenant
    console.debug('[api] register: creating tenant', name, subdomain);
    const tenant = await dbCreateTenant(sb, { name, subdomain, operatingHoursStart, operatingHoursEnd });
    if (!tenant) return serverError('Failed to create tenant');

    // 2. Create admin user
    console.debug('[api] register: creating admin user', ownerUsername);
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
      // New flow: sports with per-sport courts
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
      // Legacy flow: flat courts without sport (create default "Pickleball" sport)
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

    // 4. Create items
    const createdItems = [];
    for (const item of items ?? []) {
      const created = await dbAddItem(sb, { tenantId: tenant.id, name: item.name, price: item.price, type: item.type as ItemType });
      if (created) createdItems.push(created);
    }

    console.debug('[api] register: complete', { tenantId: tenant.id, sports: createdSports.length, courts: createdCourts.length, items: createdItems.length });

    return ok({ tenant, user, sports: createdSports, courts: createdCourts, items: createdItems });
  } catch (err) {
    console.error('[api] POST /auth/register error:', err);
    return serverError();
  }
}
