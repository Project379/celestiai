import { getLunarPhase } from '../lib/moon-phase'
import { createCoreSupabaseClient } from '../lib/supabase'
import { fetchCatalog, type CatalogRow } from './queries'
import type {
  CrystalOfTheDayResponse,
  DailyCrystalEntry,
  Streak,
} from './schemas'

export interface GetCrystalOfTheDayOptions {
  /**
   * When true, the response includes `days` — the last 60 days of daily
   * crystal entries with FK-joined crystal metadata. Switches the internal
   * SELECT from a bare `date` projection to the nested-select used by the
   * former /api/crystals/daily-streak endpoint (see the Phase-M2 unify
   * decision in the commit message that introduced this flag).
   *
   * Default: false. Non-history callers (dashboard, /api/crystals/today)
   * pay for the cheaper query; the `/api/crystals/daily-streak` wrapper
   * opts in.
   */
  includeHistory?: boolean
}

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
 *   - Authenticated users (free and premium alike) get auto-collected
 *     into user_daily_crystals (idempotent via the (user_id, date)
 *     unique index) and a 60-day rolling streak. Daily streak is the
 *     free-tier hook per the 2026-04-20 premium matrix.
 *   - `isPremium` in the response still reflects the DB tier so the UI
 *     can layer premium-only affordances on top of the shared streak.
 *
 * Returns the wire contract described by CrystalOfTheDayResponseSchema.
 * Errors propagate to the caller — this function does not catch its own
 * exceptions.
 */
export async function getCrystalOfTheDay(
  userId: string | null,
  options: GetCrystalOfTheDayOptions = {},
): Promise<CrystalOfTheDayResponse> {
  const includeHistory = options.includeHistory === true
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
  let days: DailyCrystalEntry[] | undefined

  if (userId) {
    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()
    isPremium = user?.subscription_tier === 'premium'
  }

  if (userId) {
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

    if (includeHistory) {
      // History-mode fetch: nested select pulls FK-joined crystal
      // metadata per day. Used by /api/crystals/daily-streak.
      const { data: rows } = await supabase
        .from('user_daily_crystals')
        .select(
          'date, crystal_id, crystals(slug, name_en, name_bg, color_primary, color_secondary, color_accent, svg_variant)',
        )
        .eq('user_id', userId)
        .gte('date', sixtyDaysAgo)
        .order('date', { ascending: false })

      days = (rows ?? []).map((row: Record<string, unknown>) => {
        const c = (row.crystals ?? null) as
          | {
              slug: string
              name_en: string
              name_bg: string | null
              color_primary: string
              color_secondary: string
              color_accent: string | null
              svg_variant: string
            }
          | null
        return {
          date: row.date as string,
          crystal_id: row.crystal_id as string,
          slug: c?.slug ?? null,
          name_en: c?.name_en ?? null,
          name_bg: c?.name_bg ?? null,
          color_primary: c?.color_primary ?? null,
          color_secondary: c?.color_secondary ?? null,
          color_accent: c?.color_accent ?? null,
          svg_variant: c?.svg_variant ?? null,
        }
      })
      streak = computeStreak(
        days.map((d) => d.date),
        today,
      )
    } else {
      // Lean fetch for non-history callers (dashboard, /api/crystals/today).
      const { data: rows } = await supabase
        .from('user_daily_crystals')
        .select('date')
        .eq('user_id', userId)
        .gte('date', sixtyDaysAgo)

      const dates = (rows ?? []).map((r) => r.date as string)
      streak = computeStreak(dates, today)
    }
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
    today,
    ...(days !== undefined ? { days } : {}),
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
