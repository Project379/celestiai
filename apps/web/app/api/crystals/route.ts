import { auth } from '@clerk/nextjs/server'
import { getCrystalsOverview } from '@celestia/core/crystals/overview'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals?chartId=...
 *
 * Thin wrapper over @celestia/core getCrystalsOverview(). Premium-only.
 * Core handles the lazy recommendation generation + duplicate cleanup
 * that keeps the collection flow consistent on every read.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const url = new URL(req.url)
  const chartId = url.searchParams.get('chartId')

  const result = await getCrystalsOverview(userId, chartId)

  if (result.ok) {
    return Response.json(result.data)
  }

  switch (result.error) {
    case 'PREMIUM_REQUIRED':
      return Response.json(
        { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
        { status: 403 },
      )
    case 'CHART_NOT_FOUND':
      return Response.json({ error: 'Chart not found' }, { status: 404 })
    case 'INTERNAL':
    default:
      return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
