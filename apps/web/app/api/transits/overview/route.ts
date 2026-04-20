import { auth } from '@clerk/nextjs/server'
import { getTransitsOverview } from '@celestia/core/horoscope/transits'

/**
 * GET /api/transits/overview?chartId=...
 *
 * Thin wrapper over @celestia/core getTransitsOverview(). Core function
 * returns a discriminated-union result; this wrapper maps it to HTTP
 * status codes.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

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
    case 'PREMIUM_REQUIRED':
      return Response.json(
        { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
        { status: 403 },
      )
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
}
