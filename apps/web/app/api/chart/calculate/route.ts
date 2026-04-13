import { calculateNatalChart } from '@celestia/astrology'
import type { ChartData } from '@celestia/astrology'
import { logAuditEvent } from '@/lib/audit'
import {
  requireAppUser,
  requireOwnedChart,
  toErrorResponse,
} from '@/lib/auth/guards'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { chartCalculationSchema } from '@/lib/validators/chart'

interface CalculationChart {
  id: string
  birth_date: string
  birth_time: string | null
  birth_time_known: boolean
  latitude: number
  longitude: number
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAppUser()
    const body = await request.json()

    const validation = chartCalculationSchema.safeParse(body)
    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }
      return Response.json(
        { error: 'Невалидни данни', details: fieldErrors },
        { status: 400 }
      )
    }

    const { chartId } = validation.data
    const chart = await requireOwnedChart<CalculationChart>(
      userId,
      chartId,
      'id, birth_date, birth_time, birth_time_known, latitude, longitude'
    )
    const supabase = createServiceSupabaseClient()

    const { data: cached, error: cacheError } = await supabase
      .from('chart_calculations')
      .select('*')
      .eq('chart_id', chartId)
      .single()

    if (cached && !cacheError) {
      const cachedChart: ChartData = {
        planets: cached.planet_positions as ChartData['planets'],
        houses: cached.house_cusps as ChartData['houses'],
        aspects: cached.aspects as ChartData['aspects'],
        ascendant: cached.ascendant as ChartData['ascendant'],
        mc: cached.mc as ChartData['mc'],
        birthTimeKnown: cached.birth_time_known,
      }
      return Response.json(cachedChart)
    }

    const chartData = calculateNatalChart({
      date: new Date(chart.birth_date),
      time: chart.birth_time?.slice(0, 5) || null,
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
      console.error('Failed to cache calculation:', insertError)
    }

    logAuditEvent(userId, 'data.chart_calculation', { chartId: chart.id })

    return Response.json(chartData)
  } catch (error) {
    return toErrorResponse(error, 'Грешка при обработка на заявката')
  }
}
