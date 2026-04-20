import { auth } from '@clerk/nextjs/server'
import { getCrystalOfTheDay } from '@celestia/core/crystals/today'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/daily-streak
 *
 * Thin wrapper over @celestia/core getCrystalOfTheDay({ includeHistory: true }).
 *
 * Response shape `{ streak, days, today }` is preserved verbatim from the
 * pre-M2 endpoint for backward compat with existing consumers
 * (DailyStreakPanel). Non-premium callers receive the neutral
 * `{ streak: {0,0,0}, days: [], today }` shape, matching the former
 * hand-written handler exactly.
 *
 * Phase-M2 unify decision (see commit that introduced this wrapper):
 * the 60-day user_daily_crystals fetch + computeStreak logic previously
 * existed in both crystals/today/route.ts and crystals/daily-streak/route.ts.
 * Folded into the core getCrystalOfTheDay function with an includeHistory
 * option; both route handlers are now thin reshapes of a single source.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const data = await getCrystalOfTheDay(userId, { includeHistory: true })
    return Response.json({
      streak: data.streak ?? { current: 0, longest: 0, totalDays: 0 },
      days: data.days ?? [],
      today: data.today,
    })
  } catch (error) {
    console.error('[api/crystals/daily-streak] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
