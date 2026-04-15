import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/daily-streak
 *
 * Returns the last 60 days of daily crystal visits for the current user,
 * plus a pre-computed streak summary. Premium-only (matches the rest of
 * the crystals surface).
 */

function todayIsoDate(): string {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`
}

function daysBefore(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function computeStreak(
  dates: string[],
  today: string
): { current: number; longest: number; totalDays: number } {
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

export async function GET() {
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
      return Response.json({
        streak: { current: 0, longest: 0, totalDays: 0 },
        days: [],
        today: todayIsoDate(),
      })
    }

    const today = todayIsoDate()
    const sixtyDaysAgo = daysBefore(today, 60)

    const { data: rows } = await supabase
      .from('user_daily_crystals')
      .select(
        'date, crystal_id, crystals(slug, name_en, name_bg, color_primary, color_secondary, color_accent, svg_variant)'
      )
      .eq('user_id', userId)
      .gte('date', sixtyDaysAgo)
      .order('date', { ascending: false })

    const days =
      (rows ?? []).map((row: Record<string, unknown>) => {
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

    const streak = computeStreak(
      days.map((d) => d.date),
      today
    )

    return Response.json({ streak, days, today })
  } catch (error) {
    console.error('[crystals/daily-streak] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
