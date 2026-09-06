import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'
import { collectCrystalRecommendation } from '@stellaeum/core/crystals/collect'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crystals/collect
 *
 * Body: { recommendationId: string }
 *
 * Thin wrapper over @stellaeum/core collectCrystalRecommendation().
 * Premium-only. Idempotent — collecting the same rec twice is a no-op.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({ key: `crystals-collect:${userId}`, limit: 20, windowMs: 60_000 })

    const body = (await req.json().catch(() => null)) as
      | { recommendationId?: string }
      | null
    if (!body?.recommendationId) {
      return Response.json({ error: 'Missing recommendationId' }, { status: 400 })
    }

    const result = await collectCrystalRecommendation(
      userId,
      body.recommendationId,
    )

    if (result.ok) {
      return Response.json({
        userCrystal: result.data.userCrystal,
        recommendation: result.data.recommendation,
      })
    }

    switch (result.error) {
      case 'PREMIUM_REQUIRED':
        return Response.json(
          { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
          { status: 403 },
        )
      case 'NOT_FOUND':
        return Response.json(
          { error: 'Recommendation not found or already collected' },
          { status: 404 },
        )
      case 'INTERNAL':
      default:
        // CAUGHT-500S (historical) — was a bare 500, invisible
        // to Sentry. Not a caught exception — a result.error code from
        // collectCrystalRecommendation — so captureMessage. See
        // .planning/PLACEHOLDERS.md.
        Sentry.captureMessage('Unexpected crystal-collect result code', {
          level: 'error',
          extra: { context: 'POST /api/crystals/collect', resultError: result.error },
        })
        return Response.json({ error: 'Internal error' }, { status: 500 })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
}
