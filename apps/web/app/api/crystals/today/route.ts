import { auth } from '@clerk/nextjs/server'
import { getLunarPhase } from '@/lib/moon-phase'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { fetchCatalog } from '@/lib/crystals/queries'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/today
 *
 * Returns today's crystal (tied to the lunar phase), plus — for premium
 * users — the current streak and whether today's stone has already been
 * collected. Collecting itself is a manual POST to /api/crystals/daily/collect,
 * so this endpoint is read-only and safe to hit on every page load.
 */

interface StreakData {
  current: number
  longest: number
  totalDays: number
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

function computeStreak(dates: string[], today: string): StreakData {
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
  try {
    const supabase = createServiceSupabaseClient()
    const catalog = await fetchCatalog(supabase)

    const lunarPhase = getLunarPhase()
    const matches = catalog.filter((c) =>
      (c.moon_phases as string[]).includes(lunarPhase.id)
    )

    const pick = matches[0] ?? catalog.find((c) => c.slug === 'clear-quartz')
    if (!pick) {
      return Response.json({ error: 'No crystal available' }, { status: 500 })
    }

    const { userId } = await auth()

    let streak: StreakData | null = null
    let isPremium = false
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
      const today = todayIsoDate()

      // Auto-collect on login/page-load. The daily stream is friction-free
      // by design — users get rewarded just for showing up. The rare-stone
      // collect loop (Прозорци tab) is where the manual collect lives.
      // Unique (user_id, date) index makes this a no-op if already collected.
      const { error: insertError } = await supabase
        .from('user_daily_crystals')
        .insert({
          user_id: userId,
          crystal_id: pick.id,
          date: today,
        })

      if (insertError && insertError.code !== '23505') {
        console.warn('[crystals/today] auto-collect failed', insertError)
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

    return Response.json({
      crystal: pick,
      lunarPhase: {
        id: lunarPhase.id,
        name: lunarPhase.name,
        latin: lunarPhase.latin,
        illumination: lunarPhase.illumination,
      },
      streak,
      isPremium,
      collectedToday,
    })
  } catch (error) {
    console.error('[crystals/today] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
