import { auth } from '@clerk/nextjs/server'
import { generateText, streamText } from 'ai'
import type { TransitAspect } from '@stellaeum/astrology'
import type { PlanetPosition } from '@stellaeum/astrology/client'
import { AI_MODEL, openrouter } from '@/lib/ai/client'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { logAuditEvent } from '@/lib/audit'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import { transitAndNatalToPromptText } from '@/lib/horoscope/transit-to-prompt'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import {
  checkQuotaAvailable,
  decrementQuotaUsage,
  incrementQuotaUsage,
  quotaCapReachedResponse,
} from '@/lib/subscriptions/quota'

export const maxDuration = 60

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Hoisted so refund paths in the outer catch + stream callbacks can see
  // it. Set non-null only after a successful cap-claim against a free-tier
  // row (mirrors apps/web/app/api/oracle/generate/route.ts).
  let claimedPeriodStart: Date | null = null

  try {
    // failClosed (2026-08-26 sweep #17): this route calls a paid OpenRouter
    // model — same reasoning as oracle/generate.
    await assertRateLimit({
      key: `horoscope-generate:${userId}`,
      limit: 5,
      windowMs: 60_000,
      failClosed: true,
    })

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

    // SECURITY/COST FIX (2026-08-26 sweep, finding #2): this route called no
    // quota check of any kind — checkQuotaAvailable/incrementQuotaUsage were
    // only ever wired into oracle/generate. Chained with uncapped chart
    // creation (finding #3, now capped in createBirthChart), a free account
    // could reach thousands of unquota'd paid generations/day by creating a
    // fresh chart per request. Reuses the same monthly ai_readings cap as
    // oracle/generate. 2026-08-26 (Tier 2 #4): premium goes through this
    // too now, at a much higher safety-net limit — see quota.ts's module
    // doc comment and quotaCapReachedResponse for the tier-specific
    // response shape (free: 429 + number; premium: 503, invisible by
    // design).
    const user = await ensureUserRecord(userId)
    const quota = await checkQuotaAvailable(user)
    if (!quota.available) {
      return quotaCapReachedResponse(user, quota)
    }

    const claim = await incrementQuotaUsage(userId, quota.periodStart)
    if (!claim.success) {
      return quotaCapReachedResponse(user, quota)
    }
    claimedPeriodStart = quota.periodStart

    let transitPlanets: Omit<PlanetPosition, 'house'>[]

    const { data: transitCache } = await supabase
      .from('daily_transits')
      .select('planet_positions')
      .eq('date', today)
      .single()

    if (transitCache) {
      transitPlanets = transitCache.planet_positions as Omit<PlanetPosition, 'house'>[]
    } else {
      const { calculateDailyTransits } = await import('@stellaeum/astrology')
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
      const { calculateNatalChart } = await import('@stellaeum/astrology')

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

    const { calculateTransitAspects } = await import('@stellaeum/astrology')
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

    // Astrological conditions only — no chartId/userId. Feeds the
    // bg_generation_flags safety net (observes, never corrects).
    const generationConditions = {
      activeTransits: transitOverview.activeTransits.map((t) => ({
        transitPlanet: t.transitPlanet,
        aspect: t.aspect,
        natalPlanet: t.natalPlanet,
      })),
      lunarEvents: transitOverview.lunarEvents.map((e) => ({
        type: e.type,
        sign: e.sign,
      })),
    }

    // SECURITY/COST FIX (2026-08-14, Batch 5.5 #5): claim this chart+date
    // pair BEFORE calling the paid AI model, using a real INSERT (not the
    // upsert used below) against daily_horoscopes_chart_date_unique
    // (UNIQUE(chart_id, date) — confirmed live in
    // 20260413141504_schema_hardening.sql, not assumed) as an
    // application-level lock. Two concurrent requests both pass the
    // cache-miss check above and both reach here; only one INSERT can
    // succeed, and the loser's fails with 23505 immediately — well before
    // either request would otherwise reach the AI call — closing the
    // duplicate-paid-generation race. The placeholder content is
    // overwritten by the real upsert below once generation finishes; a
    // generation failure deletes the claim so a retry isn't permanently
    // blocked by an empty placeholder row.
    const { error: claimError } = await supabase.from('daily_horoscopes').insert({
      chart_id: chartId,
      user_id: userId,
      date: requestedDate,
      content: '',
      model_version: AI_MODEL,
    })

    if (claimError) {
      if (claimedPeriodStart) {
        await decrementQuotaUsage(userId, claimedPeriodStart)
      }
      if ((claimError as { code?: string }).code === '23505') {
        return Response.json(
          { error: 'Хороскопът вече се генерира. Опитай отново след малко.' },
          { status: 429 }
        )
      }
      console.error('[Horoscope Generate] Failed to claim generation slot:', claimError)
      return Response.json(
        { error: 'Failed to prepare horoscope generation.' },
        { status: 500 }
      )
    }

    async function releaseClaimOnFailure() {
      const { error } = await supabase
        .from('daily_horoscopes')
        .delete()
        .eq('chart_id', chartId)
        .eq('date', requestedDate)
        .eq('content', '')
      if (error) {
        // If this delete itself fails, the empty placeholder row (content:
        // '') is left in place, and daily_horoscopes_chart_date_unique
        // blocks any retry from re-claiming (chart_id, date) — the route
        // would serve an empty "cached" horoscope for the rest of THIS
        // calendar day (bounded, not permanent — date is part of the
        // unique key, so tomorrow's claim succeeds regardless).
        console.error(
          '[Horoscope Generate] Failed to release claim after generation failure — chart+date stuck at empty content until the date rolls over:',
          { chartId, date: requestedDate, error },
        )
      }
      if (claimedPeriodStart) {
        await decrementQuotaUsage(userId!, claimedPeriodStart)
      }
    }

    if (jsonOnly) {
      let result
      try {
        result = await generateText({
          model: openrouter(AI_MODEL),
          system: systemPrompt,
          prompt: promptText,
          temperature: 0.85,
          maxOutputTokens: 1500,
        })
      } catch (err) {
        await releaseClaimOnFailure()
        throw err
      }

      void checkAndLogGeneration({
        source: 'horoscope',
        model: AI_MODEL,
        text: result.text,
        conditions: generationConditions,
      })

      // FIX (2026-08-26, follow-up to sweep #7): this was wrapped in
      // try/catch, which cannot catch a supabase-js failure — .upsert()
      // returns { error }, it doesn't throw. The generated content still
      // reaches the caller below either way; checking here just makes a
      // silent cache-write failure visible instead of invisible (the
      // content already returned to the user was never wrong, only
      // uncached — a later request for the same chart+date would find the
      // stuck-empty placeholder row and re-serve blank content for the
      // rest of the day, same bounded shape as releaseClaimOnFailure).
      const { error: saveError } = await supabase.from('daily_horoscopes').upsert(
        {
          chart_id: chartId,
          user_id: userId,
          date: requestedDate,
          content: result.text,
          model_version: AI_MODEL,
        },
        { onConflict: 'chart_id,date' }
      )
      if (saveError) {
        console.error('[Horoscope Generate] Failed to save horoscope:', { chartId, date: requestedDate, error: saveError })
      }

      return Response.json({
        content: result.text,
        cached: false,
        generatedAt: new Date().toISOString(),
      })
    }

    const result = streamText({
      model: openrouter(AI_MODEL),
      system: systemPrompt,
      prompt: promptText,
      temperature: 0.85,
      maxOutputTokens: 1500,
      onFinish: async ({ text }) => {
        void checkAndLogGeneration({
          source: 'horoscope',
          model: AI_MODEL,
          text,
          conditions: generationConditions,
        })

        // Same fix as the jsonOnly path above — check the returned error
        // instead of a try/catch that can't catch it.
        const { error: saveError } = await supabase.from('daily_horoscopes').upsert(
          {
            chart_id: chartId,
            user_id: userId,
            date: requestedDate,
            content: text,
            model_version: AI_MODEL,
          },
          { onConflict: 'chart_id,date' }
        )
        if (saveError) {
          console.error('[Horoscope Generate] Failed to save horoscope:', { chartId, date: requestedDate, error: saveError })
        }
      },
      onError: () => {
        void releaseClaimOnFailure()
      },
    })

    return result.toTextStreamResponse()
  } catch (error) {
    return toErrorResponse(error, 'Failed to generate horoscope.')
  }
}
