import { auth } from '@clerk/nextjs/server'
import { calculateNatalChart } from '@celestia/astrology'
import type { PlanetPosition } from '@celestia/astrology'
import { getLunarPhase } from '@/lib/moon-phase'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import {
  fetchCatalog,
  fetchUserCollection,
  fetchActiveRecommendations,
  insertRecommendationIfNew,
  toCatalogEntry,
} from '@/lib/crystals/queries'
import { recommendCrystals } from '@/lib/crystals/recommend'

export const dynamic = 'force-dynamic'

/**
 * GET /api/crystals?chartId=...
 *
 * Premium-only. Returns the user's full crystal state:
 *   - catalog (all crystals, for the collection browsing UI)
 *   - collection (what the user has discovered)
 *   - recommendations (active sparse recs ready to collect)
 *
 * Lazy-generates any missing recommendations for the current moment so
 * the user never has to wait for a cron to run. The unique index on
 * (user_id, reason_code, valid_from) makes this safe on repeated calls.
 */
export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    const supabase = createServiceSupabaseClient()

    const { data: user } = await supabase
      .from('users')
      .select('subscription_tier')
      .eq('clerk_id', userId)
      .single()

    if (user?.subscription_tier !== 'premium') {
      return Response.json(
        { error: 'Premium subscription required.', code: 'PREMIUM_REQUIRED' },
        { status: 403 }
      )
    }

    const catalogRows = await fetchCatalog(supabase)
    const catalog = catalogRows.map(toCatalogEntry)

    let natalPlanets: PlanetPosition[] = []
    let resolvedChartId: string | null = null

    if (chartId) {
      const { data: chart } = await supabase
        .from('charts')
        .select('id, user_id, birth_date, birth_time, birth_time_known, latitude, longitude')
        .eq('id', chartId)
        .single()

      if (!chart || chart.user_id !== userId) {
        return Response.json({ error: 'Chart not found' }, { status: 404 })
      }

      resolvedChartId = chart.id

      const { data: calculation } = await supabase
        .from('chart_calculations')
        .select('planet_positions')
        .eq('chart_id', chart.id)
        .single()

      if (calculation?.planet_positions) {
        natalPlanets = calculation.planet_positions as PlanetPosition[]
      } else {
        const chartData = calculateNatalChart({
          date: new Date(chart.birth_date),
          time: chart.birth_time || null,
          lat: chart.latitude,
          lon: chart.longitude,
          birthTimeKnown: chart.birth_time_known,
        })
        natalPlanets = chartData.planets
      }
    }

    const now = new Date()
    const lunarPhase = getLunarPhase(now)

    const drafts = recommendCrystals({
      now,
      lunarPhase,
      natalPlanets,
      catalog,
    })

    for (const draft of drafts) {
      const crystalRow = catalogRows.find((c) => c.slug === draft.crystalSlug)
      if (!crystalRow) continue

      await insertRecommendationIfNew(supabase, {
        userId,
        chartId: resolvedChartId,
        crystalId: crystalRow.id,
        triggerType: draft.triggerType,
        reasonCode: draft.reasonCode,
        reasonTextEn: draft.reasonTextEn,
        validFrom: draft.validFrom,
        validUntil: draft.validUntil,
      })
    }

    const [collection, recommendations] = await Promise.all([
      fetchUserCollection(supabase, userId),
      fetchActiveRecommendations(supabase, userId, now),
    ])

    return Response.json({
      catalog: catalogRows,
      collection,
      recommendations,
      lunarPhase: {
        id: lunarPhase.id,
        name: lunarPhase.name,
        latin: lunarPhase.latin,
        illumination: lunarPhase.illumination,
      },
    })
  } catch (error) {
    console.error('[crystals] error', error)
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
