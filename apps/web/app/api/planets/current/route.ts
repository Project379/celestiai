import { getCurrentPlanets } from '@stellaeum/core/planets/current'

/**
 * GET /api/planets/current
 *
 * Thin wrapper over @stellaeum/core getCurrentPlanets(). Public endpoint
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
