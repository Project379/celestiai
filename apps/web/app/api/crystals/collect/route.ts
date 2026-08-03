import { auth } from '@clerk/nextjs/server'
import { collectCrystalRecommendation } from '@stellaeum/core/crystals/collect'

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
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

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
      return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
