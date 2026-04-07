import { calculateNatalChart } from '@celestia/astrology'

/**
 * GET /api/planets/current
 *
 * Returns current real-time planet positions using Swiss Ephemeris.
 * Used by the celestial background animation.
 * No auth required — this is public astronomical data.
 *
 * Response is cached for 10 minutes (planets move slowly enough).
 */
export async function GET() {
  const now = new Date()

  const chart = calculateNatalChart({
    date: now,
    time: `${now.getUTCHours().toString().padStart(2, '0')}:${now.getUTCMinutes().toString().padStart(2, '0')}`,
    lat: 0,
    lon: 0,
    birthTimeKnown: true,
  })

  const planets = chart.planets.map((p) => ({
    name: p.planet,
    longitude: p.longitude,
    latitude: p.latitude,
    speed: p.speed,
    sign: p.sign,
  }))

  return Response.json(
    { planets, calculatedAt: now.toISOString() },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=300',
      },
    }
  )
}
