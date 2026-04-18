import { getCurrentPlanets } from '@celestia/core/planets/current'

/**
 * GET /api/planets/current
 *
 * Thin wrapper over @celestia/core getCurrentPlanets(). Public endpoint
 * — no auth. Response cached 10min because planetary motion is slow.
 */
export function GET() {
  const data = getCurrentPlanets()
  return Response.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
    },
  })
}
