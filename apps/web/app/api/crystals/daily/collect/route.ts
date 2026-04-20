import { auth } from '@clerk/nextjs/server'
import { collectDailyCrystal } from '@celestia/core/crystals/daily-collect'

export const dynamic = 'force-dynamic'

/**
 * POST /api/crystals/daily/collect
 *
 * Manually collects today's daily crystal into `user_daily_crystals`.
 * Premium-only. Idempotent via the unique (user_id, date) index. See
 * core daily-collect.ts for the M3 pick-unification note.
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await collectDailyCrystal(userId)

  if (result.ok) {
    return Response.json({
      success: true,
      crystal: result.data.crystal,
      alreadyCollected: result.data.alreadyCollected,
    })
  }

  switch (result.error) {
    case 'PREMIUM_REQUIRED':
      return Response.json(
        { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
        { status: 403 },
      )
    case 'NO_CRYSTAL':
      return Response.json(
        { error: 'No crystal available' },
        { status: 500 },
      )
    case 'INTERNAL':
    default:
      return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
