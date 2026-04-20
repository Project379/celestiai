import { createCoreSupabaseClient } from '../lib/supabase'
import { getCrystalOfTheDay } from './today'
import { getSubscriptionTier } from '../subscription/tier'
import type { CrystalOfTheDayResponse } from './schemas'

export type CollectDailyCrystalResult =
  | {
      ok: true
      data: {
        crystal: CrystalOfTheDayResponse['crystal']
        alreadyCollected: boolean
      }
    }
  | { ok: false; error: 'PREMIUM_REQUIRED' | 'NO_CRYSTAL' | 'INTERNAL' }

/**
 * Core function: manually collect today's daily crystal.
 *
 * Premium-gated. Idempotent via the unique (user_id, date) index on
 * `user_daily_crystals` — the second call on the same day returns
 * `alreadyCollected: true`.
 *
 * Pick-unification fix (M3): the pre-extraction route handler picked the
 * daily stone via `catalog.filter(...lunarPhase).slice(0,1)`, while the
 * read path (`getCrystalOfTheDay`) picks via deterministic
 * `sort-by-slug + daysSinceEpochUTC % matches.length`. On a day with
 * multiple matches the POST could collect a different stone than the GET
 * had just displayed. We now delegate pick selection to
 * `getCrystalOfTheDay` so the read and the manual write agree. The
 * auto-collect side effect inside `getCrystalOfTheDay` also happens to
 * insert the row for free — this function only needs to detect whether
 * it was a fresh insert or a no-op.
 */
export async function collectDailyCrystal(
  userId: string,
): Promise<CollectDailyCrystalResult> {
  try {
    const tier = await getSubscriptionTier(userId)
    if (tier !== 'premium') {
      return { ok: false, error: 'PREMIUM_REQUIRED' }
    }

    // Snapshot whether today's row already existed BEFORE calling
    // getCrystalOfTheDay (which will insert it if missing).
    const supabase = createCoreSupabaseClient()
    const today = todayIsoDate()

    const { data: existingRows } = await supabase
      .from('user_daily_crystals')
      .select('crystal_id')
      .eq('user_id', userId)
      .eq('date', today)
      .limit(1)

    const alreadyCollected = (existingRows?.length ?? 0) > 0

    // Delegate to the canonical picker + auto-collect path.
    const data = await getCrystalOfTheDay(userId)

    return {
      ok: true,
      data: {
        crystal: data.crystal,
        alreadyCollected,
      },
    }
  } catch (err) {
    console.error('[core/crystals/daily-collect] error:', err)
    return { ok: false, error: 'INTERNAL' }
  }
}

function todayIsoDate(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}
