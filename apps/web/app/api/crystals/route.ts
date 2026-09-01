import { auth } from '@clerk/nextjs/server'
import { getCrystalsOverview } from '@stellaeum/core/crystals/overview'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals?chartId=...
 *
 * Thin wrapper over @stellaeum/core getCrystalsOverview(). Returns 200 for
 * every authed user (tier item 5, 2026-09-01): free tier gets the catalog
 * grid with `locked: true` and empty collection/recommendations so the
 * client can render it locked; premium gets the full personalised payload
 * (`locked: false`), including the lazy recommendation generation +
 * duplicate cleanup. `collect` + recommendation writes stay premium-only.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({ key: `crystals-overview:${userId}`, limit: 30, windowMs: 60_000 })

    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    const result = await getCrystalsOverview(userId, chartId)

    if (result.ok) {
      return Response.json(result.data)
    }

    switch (result.error) {
      case 'CHART_NOT_FOUND':
        return Response.json({ error: 'Chart not found' }, { status: 404 })
      case 'INTERNAL':
      default:
        return Response.json({ error: 'Internal error' }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
}
