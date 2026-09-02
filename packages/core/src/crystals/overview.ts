import {
  calculateNatalChart,
  calculateDailyTransits,
  calculateTransitAspects,
} from '@stellaeum/astrology'
import type { PlanetPosition } from '@stellaeum/astrology'
import { getLunarPhase } from '../lib/moon-phase'
import { createCoreSupabaseClient } from '../lib/supabase'
import { getSubscriptionTier } from '../subscription/tier'
import {
  cleanupDuplicateRecommendations,
  fetchActiveRecommendations,
  fetchCatalog,
  fetchUserCollection,
  insertRecommendationIfNew,
  toCatalogEntry,
  type CatalogRow,
  type CrystalRecommendationRow,
  type UserCrystalRow,
} from './queries'
import { recommendCrystals } from './recommend'

export interface CrystalsOverview {
  catalog: CatalogRow[]
  collection: UserCrystalRow[]
  recommendations: CrystalRecommendationRow[]
  lunarPhase: {
    id: string
    name: string
    latin: string
    illumination: number
  }
  /**
   * Free tier (tier item 5): the catalog grid is returned so it can be
   * browsed in a locked state, but `collection` and `recommendations` are
   * empty and no writes happen. Premium: `false`.
   */
  locked: boolean
}

export type CrystalsOverviewResult =
  | { ok: true; data: CrystalsOverview }
  | {
      ok: false
      error: 'CHART_NOT_FOUND' | 'INTERNAL'
    }

/**
 * Core function: compute the premium user's full crystals-page payload.
 *
 * Behavior identical to apps/web/app/api/crystals/route.ts at commit
 * 6422810: premium gate, optional chart-scoped natal lookup (cache-or-
 * compute), historical duplicate cleanup, recommendation generation with
 * "one transit rec per calendar month" guard, then return
 * { catalog, collection, recommendations, lunarPhase }.
 */
export async function getCrystalsOverview(
  userId: string,
  chartId: string | null,
): Promise<CrystalsOverviewResult> {
  try {
    const tier = await getSubscriptionTier(userId)

    const supabase = createCoreSupabaseClient()
    const catalogRows = await fetchCatalog(supabase)
    const catalog = catalogRows.map(toCatalogEntry)

    // Free tier: return the catalog grid only — no chart-derived
    // recommendations, no collection, no DB writes. The client renders it
    // in a locked state (collect + recommendations stay premium-only,
    // enforced here and on /api/crystals/collect).
    if (tier !== 'premium') {
      const lp = getLunarPhase(new Date())
      return {
        ok: true,
        data: {
          catalog: catalogRows,
          collection: [],
          recommendations: [],
          lunarPhase: {
            id: lp.id,
            name: lp.name,
            latin: lp.latin,
            illumination: lp.illumination,
          },
          locked: true,
        },
      }
    }

    let natalPlanets: PlanetPosition[] = []
    let resolvedChartId: string | null = null

    if (chartId) {
      const { data: chart } = await supabase
        .from('charts')
        .select(
          'id, user_id, birth_date, birth_time, birth_time_known, approximate_time_range, latitude, longitude',
        )
        .eq('id', chartId)
        .single()

      if (!chart || chart.user_id !== userId) {
        return { ok: false, error: 'CHART_NOT_FOUND' }
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
          approximateTimeRange: chart.approximate_time_range,
        })
        natalPlanets = chartData.planets
      }
    }

    const now = new Date()
    const lunarPhase = getLunarPhase(now)

    // Clean up legacy duplicates first — the old unique index allowed
    // validFrom drift, so users can end up with 20+ copies of the same rec.
    await cleanupDuplicateRecommendations(supabase, userId)

    let transitAspects: ReturnType<typeof calculateTransitAspects> = []
    if (natalPlanets.length > 0) {
      try {
        const dailyTransits = calculateDailyTransits(now)
        transitAspects = calculateTransitAspects(dailyTransits, natalPlanets)
      } catch (err) {
        console.warn('[core/crystals/overview] transit calculation failed', err)
      }
    }

    const drafts = recommendCrystals({
      now,
      lunarPhase,
      natalPlanets,
      transitAspects,
      catalog,
    })

    // Enforce "one transit rec per calendar month"
    const monthKey = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}`
    const { data: existingTransits } = await supabase
      .from('crystal_recommendations')
      .select('reason_code')
      .eq('user_id', userId)
      .eq('trigger_type', 'transit')
      .like('reason_code', `%_${monthKey}`)

    const hasTransitThisMonth = (existingTransits?.length ?? 0) > 0

    for (const draft of drafts) {
      if (draft.triggerType === 'transit' && hasTransitThisMonth) continue

      const crystalRow = catalogRows.find((c) => c.slug === draft.crystalSlug)
      if (!crystalRow) continue

      await insertRecommendationIfNew(supabase, {
        userId,
        chartId: resolvedChartId,
        crystalId: crystalRow.id,
        triggerType: draft.triggerType,
        reasonCode: draft.reasonCode,
        reasonTextEn: draft.reasonTextEn,
        reasonTextBg: draft.reasonTextBg,
        validFrom: draft.validFrom,
        validUntil: draft.validUntil,
      })
    }

    const [collection, recommendations] = await Promise.all([
      fetchUserCollection(supabase, userId),
      fetchActiveRecommendations(supabase, userId, now),
    ])

    return {
      ok: true,
      data: {
        catalog: catalogRows,
        collection,
        recommendations,
        lunarPhase: {
          id: lunarPhase.id,
          name: lunarPhase.name,
          latin: lunarPhase.latin,
          illumination: lunarPhase.illumination,
        },
        locked: false,
      },
    }
  } catch (err) {
    console.error('[core/crystals/overview] error:', err)
    return { ok: false, error: 'INTERNAL' }
  }
}
