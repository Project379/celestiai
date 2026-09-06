import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'
import { RecommendationFeedbackRequestSchema } from '@stellaeum/core/recommendations/schemas'
import { updateRecommendationFeedback } from '@stellaeum/core/recommendations/service'
import { requireAccountActive, requireAppUser, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/** POST /api/recommendations/feedback — saved/consumed state and optional sentiment. */
export async function POST(request: Request) {
  try {
    const { userId } = await auth()
    if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
    await assertRateLimit({
      key: `media-recommendations-feedback:${userId}`,
      limit: 30,
      windowMs: 60_000,
    })
    const { user } = await requireAppUser()
    requireAccountActive(user)

    const parsed = RecommendationFeedbackRequestSchema.safeParse(
      await request.json().catch(() => null),
    )
    if (!parsed.success) {
      return Response.json(
        { error: 'Invalid feedback request', issues: parsed.error.issues },
        { status: 400 },
      )
    }

    const result = await updateRecommendationFeedback(userId, parsed.data)
    if (result.ok) return Response.json(result.data)
    if (result.error === 'NOT_FOUND') {
      return Response.json({ error: 'Recommendation not found', code: result.error }, { status: 404 })
    }
    // CAUGHT-500S (historical) — was a bare 500, invisible to
    // Sentry (see .planning/PLACEHOLDERS.md). Not a caught exception — an
    // unexpected result.error code from updateRecommendationFeedback —
    // so captureMessage, not captureException.
    Sentry.captureMessage('Unexpected recommendation-feedback result code', {
      level: 'error',
      extra: { context: 'POST /api/recommendations/feedback', resultError: result.error },
    })
    return Response.json({ error: 'Internal error', code: result.error }, { status: 500 })
  } catch (error) {
    return toErrorResponse(error, 'Failed to update recommendation feedback')
  }
}
