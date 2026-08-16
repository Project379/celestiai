import { auth } from '@clerk/nextjs/server'
import { collectDailyCrystal } from '@stellaeum/core/crystals/daily-collect'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crystals/daily/collect
 *
 * Manually collects today's daily crystal into `user_daily_crystals`.
 * Open to any authenticated user — daily streak is the free-tier hook
 * per the 2026-04-20 premium matrix. Idempotent via the unique
 * (user_id, date) index. See core daily-collect.ts for the M3 pick-
 * unification note.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({ key: `crystals-daily-collect:${userId}`, limit: 10, windowMs: 60_000 })

    const result = await collectDailyCrystal(userId)

    if (result.ok) {
      return Response.json({
        success: true,
        crystal: result.data.crystal,
        alreadyCollected: result.data.alreadyCollected,
      })
    }

    switch (result.error) {
      case 'NO_CRYSTAL':
        return Response.json(
          { error: 'No crystal available' },
          { status: 500 },
        )
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
