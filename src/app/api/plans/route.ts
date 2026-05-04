import { getServerSupabase } from '@/lib/supabase-server';
import { dbGetPlans } from '@/lib/db-subscription';
import { ok, serverError } from '@/lib/api-response';
import { formatPlanPrice, getPlanLimits } from '@/lib/subscription';

export const dynamic = 'force-dynamic';

/** Public route — returns active, non-contact-only plans for the billing/pricing page. */
export async function GET() {
  try {
    const sb = getServerSupabase();
    const plans = await dbGetPlans(sb);

    const publicPlans = plans
      .filter((p) => !p.isContactOnly)
      .map((p) => ({
        slug: p.slug,
        name: p.name,
        description: p.description,
        price: p.basePrice,
        priceLabel: formatPlanPrice(p),
        perExtraCourt: p.perExtraCourt || undefined,
        includedCourts: p.includedCourts || undefined,
        limits: getPlanLimits(p),
      }));

    return ok(publicPlans);
  } catch (err) {
    console.error('[api] GET /plans error:', err);
    return serverError();
  }
}
