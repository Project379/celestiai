import { auth } from '@clerk/nextjs/server'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'
import { transitAndNatalToPromptText } from '@/lib/horoscope/transit-to-prompt'
import type { PlanetPosition } from '@celestia/astrology/client'
import type { TransitAspect } from '@celestia/astrology'

/**
 * POST /api/horoscope/generate
 * Streams an AI-generated daily horoscope for a given chart.
 *
 * Flow:
 * 1. Auth check
 * 2. Parse body: { chartId }, optional ?date=YYYY-MM-DD query param
 * 3. Resolve today's date in Sofia timezone (cache key)
 * 4. Validate optional date param (only today or yesterday allowed)
 * 5. Chart ownership verification
 * 6. Cache check — return cached horoscope without calling Gemini
 * 7. Get/cache transit positions (global per date, shared across users)
 * 8. Load natal chart_calculations for the chartId
 * 9. Compute transit-to-natal aspects
 * 10. Build system prompt and user prompt text
 * 11. Stream via Gemini gemini-2.5-flash
 * 12. onFinish: insert into daily_horoscopes
 */
export const maxDuration = 60

export async function POST(req: Request) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    // 2. Parse body
    const body = await req.json()
    const { chartId } = body as { chartId?: string }

    if (!chartId || typeof chartId !== 'string') {
      return Response.json({ error: 'Невалиден chartId' }, { status: 400 })
    }

    // 3. Resolve today's date in Sofia timezone — avoids UTC boundary mismatch
    // Using 'en-CA' locale gives 'YYYY-MM-DD' format directly
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(new Date())

    // 4. Optional ?date= query param — only today or yesterday is allowed
    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')

    let requestedDate = today

    if (dateParam) {
      // Validate YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        return Response.json(
          { error: 'Невалиден формат на дата. Използвайте YYYY-MM-DD' },
          { status: 400 }
        )
      }

      // Only allow today or yesterday
      const todayDate = new Date(today)
      const yesterdayDate = new Date(todayDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Sofia',
      }).format(yesterdayDate)

      if (dateParam !== today && dateParam !== yesterday) {
        return Response.json(
          { error: 'Може да заявите само днешния или вчерашния хороскоп' },
          { status: 400 }
        )
      }

      requestedDate = dateParam
    }

    const supabase = createServiceSupabaseClient()

    // 5. Chart ownership verification
    const { data: chart, error: chartError } = await supabase
      .from('charts')
      .select('id, user_id')
      .eq('id', chartId)
      .single()

    if (chartError || !chart) {
      return Response.json({ error: 'Картата не е намерена' }, { status: 404 })
    }

    if (chart.user_id !== userId) {
      return Response.json({ error: 'Неоторизиран достъп' }, { status: 403 })
    }

    // 6. Cache check — return cached horoscope without calling Gemini
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

    // If requesting yesterday's horoscope and it doesn't exist — don't generate retroactively
    // Per research decision: yesterday is only available if it was generated at the time
    if (requestedDate !== today) {
      return Response.json(
        { content: null, unavailable: true },
        { status: 200 }
      )
    }

    // 7. Get/cache today's transit positions (global per date, shared across all users)
    let transitPlanets: Omit<PlanetPosition, 'house'>[]

    const { data: transitCache } = await supabase
      .from('daily_transits')
      .select('planet_positions')
      .eq('date', today)
      .single()

    if (transitCache) {
      transitPlanets = transitCache.planet_positions as Omit<
        PlanetPosition,
        'house'
      >[]
    } else {
      // Calculate fresh transit positions and cache globally
      const { calculateDailyTransits } = await import('@celestia/astrology')
      const transitData = calculateDailyTransits(new Date())
      transitPlanets = transitData.planets

      // Insert into cache (ignore conflict if concurrent request already inserted)
      await supabase.from('daily_transits').upsert(
        {
          date: today,
          planet_positions: transitPlanets,
        },
        { onConflict: 'date' }
      )
    }

    // 8. Load natal chart_calculations
    const { data: calculation, error: calcError } = await supabase
      .from('chart_calculations')
      .select(
        'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
      )
      .eq('chart_id', chartId)
      .single()

    if (calcError || !calculation) {
      return Response.json(
        {
          error:
            'Натална карта не е изчислена. Моля, изчислете картата първо.',
        },
        { status: 404 }
      )
    }

    // 9. Compute transit-to-natal aspects
    const { calculateTransitAspects } = await import('@celestia/astrology')
    const transitAspects: TransitAspect[] = calculateTransitAspects(
      { date: today, planets: transitPlanets },
      calculation.planet_positions as PlanetPosition[]
    )

    // 10. Build prompts
    const systemPrompt = buildDailyHoroscopePrompt()
    const promptText = transitAndNatalToPromptText(
      transitPlanets,
      calculation,
      transitAspects
    )

    // 11. Stream via Gemini gemini-2.5-flash
    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      prompt: promptText,
      temperature: 0.85,
      maxOutputTokens: 1500,

      // 12. onFinish: insert into daily_horoscopes
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
          // Log but don't fail — stream already returned to client
          console.error('[Horoscope Generate] Failed to save horoscope:', err)
        }
      },
    })

    // Return streaming response — toTextStreamResponse() is the v6 AI SDK API
    return result.toTextStreamResponse()
  } catch (error) {
    console.error('[Horoscope Generate] Unhandled error:', error)
    return Response.json(
      { error: 'Грешка при генериране на хороскопа' },
      { status: 500 }
    )
  }
}
