import { auth } from '@clerk/nextjs/server'
import { getLunarPhase } from '@/lib/moon-phase'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { fetchCatalog } from '@/lib/crystals/queries'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crystals/daily/collect
 *
 * Manually collects today's daily crystal into `user_daily_crystals`.
 * Premium-only. Idempotent — collecting twice on the same day is a no-op
 * via the unique (user_id, date) index.
 */

function todayIsoDate(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

export async function POST() {
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

    // Re-derive today's stone server-side so the client can't smuggle in a
    // different crystal id than the one it was shown.
    const catalog = await fetchCatalog(supabase)
    const lunarPhase = getLunarPhase()
    const matches = catalog.filter((c) =>
      (c.moon_phases as string[]).includes(lunarPhase.id)
    )
    const pick = matches[0] ?? catalog.find((c) => c.slug === 'clear-quartz')
    if (!pick) {
      return Response.json({ error: 'No crystal available' }, { status: 500 })
    }

    const today = todayIsoDate()

    const { error } = await supabase
      .from('user_daily_crystals')
      .insert({
        user_id: userId,
        crystal_id: pick.id,
        date: today,
      })

    if (error && error.code !== '23505') {
      throw error
    }

    return Response.json({
      success: true,
      crystal: pick,
      alreadyCollected: error?.code === '23505',
    })
  } catch (error) {
    console.error('[crystals/daily/collect] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
