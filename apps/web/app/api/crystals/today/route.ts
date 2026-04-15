import { getLunarPhase } from '@/lib/moon-phase'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { fetchCatalog } from '@/lib/crystals/queries'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals/today
 *
 * Free-tier endpoint. Returns the crystal tied to today's lunar phase.
 * No auth required — this is the public hook that lets free users see
 * what premium users get every day.
 */
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

    return Response.json({
      crystal: pick,
      lunarPhase: {
        id: lunarPhase.id,
        name: lunarPhase.name,
        latin: lunarPhase.latin,
        illumination: lunarPhase.illumination,
      },
    })
  } catch (error) {
    console.error('[crystals/today] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
