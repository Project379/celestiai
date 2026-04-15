import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { collectRecommendation } from '@/lib/crystals/queries'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crystals/collect
 *
 * Body: { recommendationId: string }
 *
 * Claims an active recommendation and moves it into the user's collection.
 * Premium-only. Idempotent — collecting the same rec twice is a no-op.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createServiceSupabaseClient()

    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()

    if (user?.subscription_tier !== 'premium') {
      return Response.json(
        { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      )
    }

    const body = (await req.json().catch(() => null)) as
      | { recommendationId?: string }
      | null
    if (!body?.recommendationId) {
      return Response.json(
        { error: 'Missing recommendationId' },
        { status: 400 }
      )
    }

    const result = await collectRecommendation(
      supabase,
      userId,
      body.recommendationId
    )

    if (!result) {
      return Response.json(
        { error: 'Recommendation not found or already collected' },
        { status: 404 }
      )
    }

    return Response.json({
      userCrystal: result.userCrystal,
      recommendation: result.recommendation,
    })
  } catch (error) {
    console.error('[crystals/collect] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
