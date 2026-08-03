import { calculateNatalChart } from '@celestia/astrology'
import {
  requireAppUser,
  requireOwnedChart,
  requirePremium,
  toErrorResponse,
} from '@/lib/auth/guards'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

interface TransitChart {
  id: string
  birth_date: string
  birth_time: string | null
  birth_time_known: boolean
  latitude: number
  longitude: number
}

export async function GET(req: Request) {
  try {
    const { userId, user } = await requireAppUser()
    requirePremium(user)

    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    if (!chartId) {
      return Response.json({ error: 'Missing chartId' }, { status: 400 })
    }

    const chart = await requireOwnedChart<TransitChart>(
      userId,
      chartId,
      'id, birth_date, birth_time, birth_time_known, latitude, longitude'
    )
    const supabase = createServiceSupabaseClient()

    let { data: calculation } = await supabase
      .from('chart_calculations')
      .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
      .eq('chart_id', chartId)
      .single()

    if (!calculation) {
      const chartData = calculateNatalChart({
        date: new Date(chart.birth_date),
        time: chart.birth_time?.slice(0, 5) || null,
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
          { onConflict: 'chart_id' }
        )
        .select('planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known')
        .single()

      if (insertError || !insertedCalculation) {
        console.error('[Transit Overview] Failed to bootstrap chart calculation:', insertError)
        return Response.json(
          { error: 'Failed to prepare natal chart for transit overview.' },
          { status: 500 }
        )
      }

      calculation = insertedCalculation
    }

    const overview = buildTransitOverview(calculation, new Date())
    return Response.json(overview, {
      headers: {
        'Cache-Control': 'private, max-age=900, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    return toErrorResponse(error, 'Failed to load transit overview.')
  }
}
