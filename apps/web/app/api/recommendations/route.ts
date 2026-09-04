import { auth } from '@clerk/nextjs/server'
import { getRecommendationsOverview } from '@stellaeum/core/recommendations/service'
import { requireAccountActive, requireAppUser, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** GET /api/recommendations?chartId=... — daily movie + monthly book. */
export async function GET(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
    await assertRateLimit({
      key: `media-recommendations:${userId}`,
      limit: 30,
      windowMs: 60_000,
    })
    const { user } = await requireAppUser()
    requireAccountActive(user)

    const chartId = new URL(request.url).searchParams.get('chartId')
    const result = await getRecommendationsOverview(userId, chartId)
    if (result.ok) return Response.json(result.data)

    if (result.error === 'CHART_NOT_FOUND') {
      return Response.json({ error: 'Chart not found', code: result.error }, { status: 404 })
    }
    if (result.error === 'NO_ELIGIBLE_CATALOG') {
      return Response.json(
        { error: 'No safe, licensed recommendations are available.', code: result.error },
        { status: 503 },
      )
    }
    return Response.json({ error: 'Internal error', code: result.error }, { status: 500 })
  } catch (error) {
    return toErrorResponse(error, 'Failed to load recommendations')
  }
}
