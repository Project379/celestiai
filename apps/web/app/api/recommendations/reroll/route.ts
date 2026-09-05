import { auth } from '@clerk/nextjs/server'
import { RecommendationRerollRequestSchema } from '@stellaeum/core/recommendations/schemas'
import { rerollRecommendation } from '@stellaeum/core/recommendations/service'
import { requireAccountActive, requireAppUser, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { RECS_MONTHLY_LOCKED } from '@/lib/tier/locked-copy'

export const dynamic = 'force-dynamic'

/** POST /api/recommendations/reroll — one atomic replacement per slot/period. */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
    await assertRateLimit({
      key: `media-recommendations-reroll:${userId}`,
      limit: 10,
      windowMs: 60_000,
    })
    const { user } = await requireAppUser()
    requireAccountActive(user)

    const parsed = RecommendationRerollRequestSchema.safeParse(
      await request.json().catch(() => null),
    )
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid reroll request', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await rerollRecommendation(
      userId,
      parsed.data.deliveryId,
      parsed.data.reason,
    )
    if (result.ok) return Response.json(result.data)
    if (result.error === 'NOT_FOUND') {
      return Response.json({ error: 'Recommendation not found', code: result.error }, { status: 404 })
    }
    if (result.error === 'REROLL_USED') {
      return Response.json(
        { error: 'The reroll for this recommendation was already used.', code: result.error },
        { status: 409 },
      )
    }
    if (result.error === 'NO_ELIGIBLE_CATALOG') {
      return Response.json(
        { error: 'No other safe recommendation is available.', code: result.error },
        { status: 409 },
      )
    }
    if (result.error === 'PREMIUM_REQUIRED') {
      return Response.json(
        { error: RECS_MONTHLY_LOCKED.title, code: result.error },
        { status: 403 },
      )
    }
    return Response.json({ error: 'Internal error', code: result.error }, { status: 500 })
  } catch (error) {
    return toErrorResponse(error, 'Failed to reroll recommendation')
  }
}
