import { getCurrentPlanets } from '@stellaeum/core/planets/current'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit, getRequestIp } from '@/lib/rate-limit'

/**
 * GET /api/planets/current
 *
 * Thin wrapper over @stellaeum/core getCurrentPlanets(). Public endpoint
 * — no auth by design (unlike cities/search, which is auth-gated despite
 * also serving public reference data). Response cached 10min because
 * planetary motion is slow.
 *
 * SECURITY FIX (2026-08-14, Batch 5.5 #6): had no rate limiting at all —
 * the only other route in this app with zero auth AND zero rate limit,
 * doing a real Swiss Ephemeris calculation on every request. Only
 * defense was the Cache-Control header, which protects a CDN-fronted
 * deployment but not direct-to-origin requests or non-caching clients.
 * IP-keyed (no userId available — this route is genuinely unauthenticated)
 * using the same getRequestIp helper cities/search uses for its
 * auth+IP-keyed limit.
 */
export async function GET(request: Request) {
  try {
    await assertRateLimit({
      key: `planets-current:${getRequestIp(request)}`,
      limit: 30,
      windowMs: 60_000,
    })

    const data = getCurrentPlanets()
    return Response.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при зареждане на планетите')
  }
}
