import { auth } from '@clerk/nextjs/server'
import { generateText, streamText } from 'ai'
import { google } from '@ai-sdk/google'
import type { TransitAspect } from '@celestia/astrology'
import type { PlanetPosition } from '@celestia/astrology/client'
import { logAuditEvent } from '@/lib/audit'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import { transitAndNatalToPromptText } from '@/lib/horoscope/transit-to-prompt'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { chartId } = body as { chartId?: string }

    if (!chartId || typeof chartId !== 'string') {
      return Response.json({ error: 'Invalid chartId' }, { status: 400 })
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(new Date())

    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    const peekOnly = url.searchParams.get('peek') === '1'
    const jsonOnly = url.searchParams.get('format') === 'json'
    let requestedDate = today

    if (dateParam) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return Response.json({ error: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 })
      }

      const todayDate = new Date(today)
      const yesterdayDate = new Date(todayDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Sofia',
      }).format(yesterdayDate)

      if (dateParam !== today && dateParam !== yesterday) {
        return Response.json({ error: 'Only today or yesterday is allowed.' }, { status: 400 })
      }

      requestedDate = dateParam
    }

    const supabase = createServiceSupabaseClient()

    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select(
        'id, user_id, birth_date, birth_time, birth_time_known, latitude, longitude'
      )
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return Response.json({ error: 'Chart not found' }, { status: 404 })
    }

    if (chart.user_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: cachedHoroscope } = await supabase
      .from('daily_horoscopes')
      .select('content, generated_at')
      .eq('chart_id', chartId)
      .eq('date', requestedDate)
      .single()

    if (cachedHoroscope) {
      return Response.json({
        content: cachedHoroscope.content,
        cached: true,
        generatedAt: cachedHoroscope.generated_at,
      })
    }

    if (requestedDate !== today) {
      return Response.json({ content: null, unavailable: true }, { status: 200 })
    }

    if (peekOnly) {
      return Response.json({ content: null, cached: false }, { status: 200 })
    }

    let transitPlanets: Omit<PlanetPosition, 'house'>[]

    const { data: transitCache } = await supabase
      .from('daily_transits')
      .select('planet_positions')
      .eq('date', today)
      .single()

    if (transitCache) {
      transitPlanets = transitCache.planet_positions as Omit<PlanetPosition, 'house'>[]
    } else {
      const { calculateDailyTransits } = await import('@celestia/astrology')
      const transitData = calculateDailyTransits(new Date())
      transitPlanets = transitData.planets

      await supabase.from('daily_transits').upsert(
        {
          date: today,
          planet_positions: transitPlanets,
        },
        { onConflict: 'date' }
      )
    }

    let { data: calculation } = await supabase
      .from('chart_calculations')
      .select(
        'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
      )
      .eq('chart_id', chartId)
      .single()

    if (!calculation) {
      const { calculateNatalChart } = await import('@celestia/astrology')

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
        .select(
          'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
        )
        .single()

      if (insertError || !insertedCalculation) {
        console.error('[Horoscope Generate] Failed to bootstrap chart calculation:', insertError)
        return Response.json(
          { error: 'Failed to prepare natal chart for horoscope generation.' },
          { status: 500 }
        )
      }

      calculation = insertedCalculation
    }

    const { calculateTransitAspects } = await import('@celestia/astrology')
    const transitAspects: TransitAspect[] = calculateTransitAspects(
      { date: today, planets: transitPlanets },
      calculation.planet_positions as PlanetPosition[]
    )
    const transitOverview = buildTransitOverview(calculation, new Date())

    const systemPrompt = buildDailyHoroscopePrompt()
    const promptText = transitAndNatalToPromptText(
      transitPlanets,
      calculation,
      transitAspects,
      transitOverview
    )

    logAuditEvent(userId, 'data.horoscope_generation', {
      chartId,
      date: requestedDate,
    })

    if (jsonOnly) {
      const result = await generateText({
        model: google('gemini-2.5-flash'),
        system: systemPrompt,
        prompt: promptText,
        temperature: 0.85,
        maxOutputTokens: 1500,
      })

      try {
        await supabase.from('daily_horoscopes').insert({
          chart_id: chartId,
          user_id: userId,
          date: today,
          content: result.text,
          model_version: 'gemini-2.5-flash',
        })
      } catch (err) {
        console.error('[Horoscope Generate] Failed to save horoscope:', err)
      }

      return Response.json({
        content: result.text,
        cached: false,
        generatedAt: new Date().toISOString(),
      })
    }

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: promptText,
      temperature: 0.85,
      maxOutputTokens: 1500,
      onFinish: async ({ text }) => {
        try {
          await supabase.from('daily_horoscopes').insert({
            chart_id: chartId,
            user_id: userId,
            date: today,
            content: text,
            model_version: 'gemini-2.5-flash',
          })
        } catch (err) {
          console.error('[Horoscope Generate] Failed to save horoscope:', err)
        }
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Horoscope Generate] Unhandled error:', error)
    return Response.json(
      { error: 'Failed to generate horoscope.' },
      { status: 500 }
    )
  }
}
