import { auth } from '@clerk/nextjs/server'
import { getTransitsOverview } from '@stellaeum/core/horoscope/transits'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

/**
 * GET /api/transits/overview?chartId=...
 *
 * Thin wrapper over @stellaeum/core getTransitsOverview(). Core function
 * returns a discriminated-union result; this wrapper maps it to HTTP
 * status codes.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({ key: `transits-overview:${userId}`, limit: 30, windowMs: 60_000 })

    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')
    if (!chartId) {
      return Response.json({ error: 'Missing chartId' }, { status: 400 })
    }

    const result = await getTransitsOverview(userId, chartId)
    if (result.ok) {
      return Response.json(result.data, {
        headers: {
          'Cache-Control': 'private, max-age=900, stale-while-revalidate=600',
        },
      })
    }

    switch (result.error) {
      case 'CHART_NOT_FOUND':
        return Response.json({ error: 'Chart not found' }, { status: 404 })
      case 'FORBIDDEN':
        return Response.json({ error: 'Forbidden' }, { status: 403 })
      case 'INTERNAL':
      default:
        return Response.json(
          { error: 'Failed to load transit overview.' },
          { status: 500 },
        )
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
}
