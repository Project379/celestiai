import { calculateNatalChart } from '@stellaeum/astrology'
import type { ChartData, PlanetPosition, HouseData, PointData } from '@stellaeum/astrology'
import { createCoreSupabaseClient } from '../lib/supabase'
import { buildTransitOverview, type TransitOverview } from './transit-analysis'

export type TransitsOverviewResult =
  | { ok: true; data: TransitOverview }
  | { ok: false; error: 'CHART_NOT_FOUND' | 'FORBIDDEN' | 'INTERNAL' }

interface CalculationRow {
  planet_positions: PlanetPosition[]
  house_cusps: HouseData[]
  aspects: ChartData['aspects']
  ascendant: PointData
  mc: PointData
  birth_time_known: boolean
}

/**
 * Core function: build the transit-overview payload for a user's chart.
 *
 * Transits are FREE per the premium matrix (2026-04-20 audit). No
 * subscription_tier check — any authed user with ownership of the
 * chart can fetch a transit overview.
 *
 *   - Chart ownership verified by chartId → charts.user_id === userId
 *   - Calculation is read from chart_calculations cache if present, or
 *     computed via @stellaeum/astrology and written back on miss
 *   - Returns the TransitOverview structure built by buildTransitOverview
 *
 * Returns a discriminated-union result so the route-handler wrapper can
 * pick the right HTTP status without the core function knowing about
 * HTTP at all.
 */
export async function getTransitsOverview(
  userId: string,
  chartId: string,
): Promise<TransitsOverviewResult> {
  try {
    const supabase = createCoreSupabaseClient()

    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('id, user_id, birth_date, birth_time, birth_time_known, latitude, longitude')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return { ok: false, error: 'CHART_NOT_FOUND' }
    }

    if (chart.user_id !== userId) {
      return { ok: false, error: 'FORBIDDEN' }
    }

    let { data: calculation } = await supabase
      .from('chart_calculations')
      .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
      .eq('chart_id', chartId)
      .single()

    if (!calculation) {
      const chartData = calculateNatalChart({
        date: new Date(chart.birth_date),
        time: chart.birth_time || null,
        lat: chart.latitude,
        lon: chart.longitude,
        birthTimeKnown: chart.birth_time_known,
      })

      const { data: insertedCalculation, error: insertError } = await supabase
        .from('chart_calculations')
        .upsert(
          {
            chart_id: chartId,
            planet_positions: chartData.planets,
            house_cusps: chartData.houses,
            aspects: chartData.aspects,
            ascendant: chartData.ascendant,
            mc: chartData.mc,
            birth_time_known: chartData.birthTimeKnown,
          },
          { onConflict: 'chart_id' },
        )
        .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
        .single()

      if (insertError || !insertedCalculation) {
        console.error('[core/horoscope/transits] failed to bootstrap chart calculation:', insertError)
        return { ok: false, error: 'INTERNAL' }
      }

      calculation = insertedCalculation
    }

    const overview = buildTransitOverview(calculation as CalculationRow, new Date())
    return { ok: true, data: overview }
  } catch (error) {
    console.error('[core/horoscope/transits] unhandled error:', error)
    return { ok: false, error: 'INTERNAL' }
  }
}
