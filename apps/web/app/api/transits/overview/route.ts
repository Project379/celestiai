import { auth } from '@clerk/nextjs/server'
import { calculateNatalChart } from '@celestia/astrology'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL(req.url)
    const chartId = url.searchParams.get('chartId')

    if (!chartId) {
      return Response.json({ error: 'Missing chartId' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('id, user_id, birth_date, birth_time, birth_time_known, latitude, longitude')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return Response.json({ error: 'Chart not found' }, { status: 404 })
    }

    if (chart.user_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
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
    return Response.json(overview)
  } catch (error) {
    console.error('[Transit Overview] Unhandled error:', error)
    return Response.json({ error: 'Failed to load transit overview.' }, { status: 500 })
  }
}
