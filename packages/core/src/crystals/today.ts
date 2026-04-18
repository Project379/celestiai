import { getLunarPhase } from '../lib/moon-phase'
import { createCoreSupabaseClient } from '../lib/supabase'
import { fetchCatalog, type CatalogRow } from './queries'
import type { CrystalOfTheDayResponse, Streak } from './schemas'

/**
 * Core function: today's lunar-phase-driven crystal for the given user.
 *
 * Call sites:
 *   - apps/web dashboard Server Component (via React.cache wrapper)
 *   - apps/web /you/crystals Server Component (via same wrapper)
 *   - apps/web /api/crystals/today route handler (unwrapped)
 *   - apps/mobile HTTP client (through the route handler)
 *
 * Behavior is identical to the pre-extraction route handler at
 * apps/web/app/api/crystals/today/route.ts as it existed at commit 3a0680e:
 *   - Daily rotation deterministically picks a catalog row matching the
 *     current lunar phase (stable sort by slug, days-since-epoch mod).
 *   - Unauthenticated users (userId === null) get the rotation + phase
 *     summary with streak = null, isPremium = false, collectedToday = false.
 *   - Free-tier users (userId !== null, premium = false) get the same plus
 *     isPremium = false.
 *   - Premium users get auto-collected into user_daily_crystals (idempotent
 *     via the (user_id, date) unique index) and a 60-day rolling streak.
 *
 * Returns the wire contract described by CrystalOfTheDayResponseSchema.
 * Errors propagate to the caller — this function does not catch its own
 * exceptions.
 */
export async function getCrystalOfTheDay(
  userId: string | null,
): Promise<CrystalOfTheDayResponse> {
  const supabase = createCoreSupabaseClient()
  const catalog = await fetchCatalog(supabase)

  const lunarPhase = getLunarPhase()
  const today = todayIsoDate()

  const matches = catalog
    .filter((c) => (c.moon_phases as string[]).includes(lunarPhase.id))
    .sort((a, b) => a.slug.localeCompare(b.slug))

  const index = matches.length > 0 ? daysSinceEpochUTC(today) % matches.length : -1
  const pick: CatalogRow | undefined =
    index >= 0 ? matches[index] : catalog.find((c) => c.slug === 'clear-quartz')

  if (!pick) {
    throw new Error('Crystal catalog is empty — cannot pick a daily stone')
  }

  let isPremium = false
  let streak: Streak | null = null
  let collectedToday = false

  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()
    isPremium = user?.subscription_tier === 'premium'
  }

  if (userId && isPremium) {
    // Auto-collect on read. The unique index on (user_id, date) makes this
    // a no-op if already collected. Error code 23505 (unique_violation) is
    // swallowed — that IS the success case for a second read on the same day.
    const { error: insertError } = await supabase
      .from('user_daily_crystals')
      .insert({
        user_id: userId,
        crystal_id: pick.id,
        date: today,
      })

    if (insertError && insertError.code !== '23505') {
      console.warn('[core/crystals/today] auto-collect failed', insertError)
    }
    collectedToday = true

    const sixtyDaysAgo = daysBefore(today, 60)
    const { data: rows } = await supabase
      .from('user_daily_crystals')
      .select('date')
      .eq('user_id', userId)
      .gte('date', sixtyDaysAgo)

    const dates = (rows ?? []).map((r) => r.date as string)
    streak = computeStreak(dates, today)
  }

  return {
    crystal: {
      id: pick.id,
      slug: pick.slug,
      name_en: pick.name_en,
      name_bg: pick.name_bg,
      tagline_en: pick.tagline_en,
      tagline_bg: pick.tagline_bg,
      description_en: pick.description_en,
      description_bg: pick.description_bg,
      color_primary: pick.color_primary,
      color_secondary: pick.color_secondary,
      color_accent: pick.color_accent,
      svg_variant: pick.svg_variant,
      rarity: pick.rarity,
    },
    lunarPhase: {
      id: lunarPhase.id,
      name: lunarPhase.name,
      latin: lunarPhase.latin,
      illumination: lunarPhase.illumination,
    },
    streak,
    isPremium,
    collectedToday,
  }
}

function todayIsoDate(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function daysBefore(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function daysSinceEpochUTC(iso: string): number {
  return Math.floor(new Date(`${iso}T00:00:00Z`).getTime() / 86400000)
}

function computeStreak(dates: string[], today: string): Streak {
  const set = new Set(dates)
  let current = 0
  let cursor = today
  while (set.has(cursor)) {
    current++
    cursor = daysBefore(cursor, 1)
  }
  const sorted = [...set].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const d of sorted) {
    if (prev && daysBefore(d, 1) === prev) {
      run++
    } else {
      run = 1
    }
    if (run > longest) longest = run
    prev = d
  }
  return { current, longest, totalDays: set.size }
}
