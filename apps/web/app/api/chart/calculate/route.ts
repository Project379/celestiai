import { auth } from '@clerk/nextjs/server'
import { calculateNatalChart } from '@celestia/astrology'
import type { ChartData } from '@celestia/astrology'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { chartCalculationSchema } from '@/lib/validators/chart'
import { logAuditEvent } from '@/lib/audit'

/**
 * POST /api/chart/calculate
 * Calculate natal chart for a given birth chart
 *
 * Requires authentication.
 * Returns cached calculation if exists, otherwise calculates and caches.
 */
export async function POST(request: Request) {
  // Check authentication - return JSON error if not authenticated
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const body = await request.json()

    // Validate input
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
    const supabase = createServiceSupabaseClient()

    // Fetch the chart and verify ownership
    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('*')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      console.error('Chart fetch error:', chartError)
      return Response.json({ error: 'Картата не е намерена' }, { status: 404 })
    }

    // Security: verify user owns this chart
    if (chart.user_id !== userId) {
      return Response.json({ error: 'Неоторизиран достъп' }, { status: 403 })
    }

    // Check for cached calculation
    const { data: cached, error: cacheError } = await supabase
      .from('chart_calculations')
      .select('*')
      .eq('chart_id', chartId)
      .single()

    if (cached && !cacheError) {
      // Return cached result
      console.log('[Chart Calculate] Returning cached calculation for:', chartId)
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

    // Calculate the natal chart
    console.log('[Chart Calculate] Calculating for chart:', chartId)

    try {
      // Parse birth date - database stores with timezone, extract date
      const birthDate = new Date(chart.birth_date)

      // Birth time from chart (HH:MM format or null)
      const birthTime = chart.birth_time || null

      const chartData = calculateNatalChart({
        date: birthDate,
        time: birthTime,
        lat: chart.latitude,
        lon: chart.longitude,
        birthTimeKnown: chart.birth_time_known,
      })

      // Cache the result
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
        // Log but don't fail - calculation still succeeded
        console.error('Failed to cache calculation:', insertError)
      } else {
        console.log('[Chart Calculate] Cached calculation for:', chartId)
      }

      logAuditEvent(userId, 'data.chart_calculation', { chartId: chart.id })

      return Response.json(chartData)
    } catch (calcError) {
      console.error('Calculation error:', calcError)
      return Response.json(
        { error: 'Грешка при изчисление. Моля, проверете данните.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in chart calculation:', error)
    return Response.json(
      { error: 'Грешка при обработка на заявката' },
      { status: 500 }
    )
  }
}
