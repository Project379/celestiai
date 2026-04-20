import { calculateNatalChart } from '@celestia/astrology'
import type { ChartData } from '@celestia/astrology'
import { createCoreSupabaseClient } from '../lib/supabase'

export type CalculateChartResult =
  | { ok: true; data: ChartData; cached: boolean }
  | {
      ok: false
      error: 'CHART_NOT_FOUND' | 'FORBIDDEN' | 'CALC_ERROR' | 'INTERNAL'
    }

/**
 * Core function: cache-or-compute the natal chart for the caller's chart row.
 *
 * Behavior identical to apps/web/app/api/chart/calculate/route.ts as it
 * existed at commit 6422810:
 *   - Chart existence → CHART_NOT_FOUND
 *   - Ownership mismatch → FORBIDDEN
 *   - chart_calculations cache hit → returns cached, cached=true
 *   - Cache miss → compute via @celestia/astrology, write back, cached=false
 *   - Calculation failure → CALC_ERROR (caller maps to 500 + BG message)
 *
 * Audit logging stays at the route-handler call site so the core package
 * keeps no framework vocabulary and the "log only on fresh compute" timing
 * is preserved explicitly.
 */
export async function calculateChartForUser(
  userId: string,
  chartId: string,
): Promise<CalculateChartResult> {
  try {
    const supabase = createCoreSupabaseClient()

    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('*')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return { ok: false, error: 'CHART_NOT_FOUND' }
    }

    if (chart.user_id !== userId) {
      return { ok: false, error: 'FORBIDDEN' }
    }

    const { data: cached } = await supabase
      .from('chart_calculations')
      .select('*')
      .eq('chart_id', chartId)
      .single()

    if (cached) {
      const cachedChart: ChartData = {
        planets: cached.planet_positions as ChartData['planets'],
        houses: cached.house_cusps as ChartData['houses'],
        aspects: cached.aspects as ChartData['aspects'],
        ascendant: cached.ascendant as ChartData['ascendant'],
        mc: cached.mc as ChartData['mc'],
        birthTimeKnown: cached.birth_time_known,
      }
      return { ok: true, data: cachedChart, cached: true }
    }

    try {
      const chartData = calculateNatalChart({
        date: new Date(chart.birth_date),
        time: chart.birth_time || null,
        lat: chart.latitude,
        lon: chart.longitude,
        birthTimeKnown: chart.birth_time_known,
      })

      const { error: insertError } = await supabase
        .from('chart_calculations')
        .insert({
          chart_id: chartId,
          planet_positions: chartData.planets,
          house_cusps: chartData.houses,
          aspects: chartData.aspects,
          ascendant: chartData.ascendant,
          mc: chartData.mc,
          birth_time_known: chartData.birthTimeKnown,
        })

      if (insertError) {
        console.error('[core/charts/calculate] cache write failed:', insertError)
      }

      return { ok: true, data: chartData, cached: false }
    } catch (calcErr) {
      console.error('[core/charts/calculate] calculation error:', calcErr)
      return { ok: false, error: 'CALC_ERROR' }
    }
  } catch (err) {
    console.error('[core/charts/calculate] unhandled error:', err)
    return { ok: false, error: 'INTERNAL' }
  }
}
