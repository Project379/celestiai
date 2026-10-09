import { createCoreSupabaseClient } from '../lib/supabase'
import { getCrystalOfTheDay } from './today'
import type { CrystalOfTheDayResponse } from './schemas'

export type CollectDailyCrystalResult =
  | {
      ok: true
      data: {
        crystal: CrystalOfTheDayResponse['crystal']
        alreadyCollected: boolean
      }
    }
  | { ok: false; error: 'NO_CRYSTAL' | 'INTERNAL' }

/**
 * Core function: manually collect today's daily crystal.
 *
 * Open to any authenticated user (free + premium). Daily streak is the
 * free-tier hook per the 2026-04-20 premium matrix; the manual Collect
 * action has to work for the same users who see the streak UI, or the
 * hook breaks.
 *
 * Idempotent via the unique (user_id, date) index on
 * `user_daily_crystals` — the second call on the same day returns
 * `alreadyCollected: true`.
 *
 * Pick-unification (M3): the pick comes from `getCrystalOfTheDay` (deterministic
 * sort-by-slug + days-since-epoch), so the read and the manual write agree.
 * Днес v2 split (2026-10-09): reading never collects any more for Днес; this is
 * the only write on that path.
 */
export async function collectDailyCrystal(
  userId: string,
): Promise<CollectDailyCrystalResult> {
  try {
    const supabase = createCoreSupabaseClient()

    // Pure read: today's pick, no side effect. The pick is the same one every
    // surface shows (M3 pick-unification), so a tap collects what the user saw.
    const data = await getCrystalOfTheDay(userId, { collect: false })
    const today = data.today

    // Collecting is this function's own write. The unique (user_id, date) index makes
    // it idempotent: a second tap the same day hits 23505 and reports alreadyCollected.
    const { error } = await supabase
      .from('user_daily_crystals')
      .insert({ user_id: userId, crystal_id: data.crystal.id, date: today })

    if (error && error.code !== '23505') {
      console.error('[core/crystals/daily-collect] insert failed:', error)
      return { ok: false, error: 'INTERNAL' }
    }

    return {
      ok: true,
      data: {
        crystal: data.crystal,
        alreadyCollected: error?.code === '23505',
      },
    }
  } catch (err) {
    console.error('[core/crystals/daily-collect] error:', err)
    return { ok: false, error: 'INTERNAL' }
  }
}

