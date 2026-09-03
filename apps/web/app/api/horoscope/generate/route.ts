import { auth } from '@clerk/nextjs/server'
import { generateText } from 'ai'
import type { TransitAspect } from '@stellaeum/astrology'
import type { PlanetPosition } from '@stellaeum/astrology/client'
import { AI_MODEL, isUpstreamAiError, openrouter } from '@/lib/ai/client'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { validateReading, type ReadingValidationResult } from '@/lib/ai/validate-reading'
import { logAuditEvent } from '@/lib/audit'
import { buildDailyHoroscopePrompt } from '@/lib/horoscope/prompts'
import { buildTransitOverview } from '@/lib/horoscope/transit-analysis'
import {
  buildHoroscopePlaceholderValues,
  transitAndNatalToPromptText,
} from '@/lib/horoscope/transit-to-prompt'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError, readJsonBody, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit, RETRY_LATER_MESSAGE } from '@/lib/rate-limit'

// 300s = the Vercel Pro ceiling. Two sequential generateText calls (the
// regenerate-once path) at ~10-25s each for the shorter horoscope prompt,
// plus validation and DB writes, comfortably fit; 60s did not leave
// headroom for a slow upstream attempt followed by a retry.
export const maxDuration = 300

/**
 * POST /api/horoscope/generate — the daily "Днес" reading.
 *
 * TIER (frozen definition 2026-09-01): Днес is FULLY FREE for every authed
 * user, every day, with no monthly cap. This route deliberately does NOT
 * touch `subscription_quotas` — that counter is now Oracle-only
 * (apps/web/lib/subscriptions/quota.ts). Until 2026-09-01 this route shared
 * the free tier's 3/month `subscription_quotas` cap with oracle/generate,
 * which meant a free user's daily horoscope died after three distinct days
 * in a month (2026-08-26 sweep #4 wired premium through it too). That
 * coupling is removed.
 *
 * The remaining brakes on paid generation here are STRUCTURAL, not a quota:
 *   - assertRateLimit: 5/min per user, failClosed (a money-spending route).
 *   - `daily_horoscopes` UNIQUE(chart_id, date): the pre-generation INSERT
 *     claim below means at most ONE generation per chart per calendar day —
 *     a repeat request for the same chart+date is a cache hit.
 *   - createBirthChart caps a user at 20 charts (2026-08-26 sweep #3).
 * Combined ceiling: 20 charts x 1/day = 20 paid generations per user per
 * day, structurally — not scriptable past that the way the pre-#3 uncapped
 * chart-creation loop was. If that ceiling ever needs lowering, it belongs
 * as its own horoscope-scoped counter, NOT by re-coupling to the Oracle
 * quota.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // failClosed (2026-08-26 sweep #17): this route calls a paid OpenRouter
    // model — same reasoning as oracle/generate.
    await assertRateLimit({
      key: `horoscope-generate:${userId}`,
      limit: 5,
      windowMs: 60_000,
      failClosed: true,
    })

    const body = await readJsonBody(req)
    const { chartId } = body as { chartId?: string }

    if (!chartId || typeof chartId !== 'string') {
      return Response.json({ error: 'Invalid chartId' }, { status: 400 })
    }

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Sofia',
    }).format(new Date())

    const url = new URL(req.url)
    const dateParam = url.searchParams.get('date')
    // `format=json` is still accepted for URL compatibility but no longer
    // switches behaviour — the route always returns a validated JSON
    // envelope now (see the generation block below).
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
        'id, user_id, birth_date, birth_time, birth_time_known, approximate_time_range, latitude, longitude'
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
        approximateTimeRange: chart.approximate_time_range,
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
    const placeholderValues = buildHoroscopePlaceholderValues(
      transitPlanets,
      calculation,
      transitAspects,
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
    //
    // NOTE (2026-09-01): this INSERT claim is ALSO the effective per-day
    // ceiling now that the monthly quota is gone — one row per (chart_id,
    // date), so one paid generation per chart per day. Do not remove it.
    const { error: claimError } = await supabase.from('daily_horoscopes').insert({
      chart_id: chartId,
      user_id: userId,
      date: requestedDate,
      content: '',
      model_version: AI_MODEL,
    })

    if (claimError) {
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
    }

    // Generate + validate before display. The daily horoscope no longer
    // streams: the pre-display validator (lib/ai/validate-reading.ts) — in
    // particular SCRIPT PURITY and placeholder substitution — has to see
    // the whole text. Both callers already POST `format=json` and read a
    // `{ content }` envelope, so no client change is needed. On a
    // validation failure we regenerate ONCE (the daily_horoscopes INSERT
    // claim already caps this to one paid slot per chart per day), then
    // fail visibly rather than persist broken output.
    async function generateRaw(): Promise<string> {
      const r = await generateText({
        model: openrouter(AI_MODEL),
        system: systemPrompt,
        prompt: promptText,
        temperature: 0.85,
        maxOutputTokens: 1500,
      })
      return r.text
    }

    let finalContent: string | null = null
    let finalPlainText = ''
    let lastValidation: ReadingValidationResult | null = null
    try {
      for (let attempt = 1; attempt <= 2 && finalContent === null; attempt++) {
        const raw = await generateRaw()
        // 400-550 chars over 3 short lines -> roughly 45-110 words. Bounds
        // kept loose; script purity + placeholder integrity are the load-
        // bearing checks for this surface.
        const validation = validateReading(raw, placeholderValues, {
          minWords: 30,
          maxWords: 160,
        })
        lastValidation = validation
        if (validation.ok) {
          finalContent = validation.content
          finalPlainText = validation.text
        } else {
          console.error('[Horoscope Generate] reading rejected by validator', {
            attempt,
            code: validation.code,
            detail: validation.detail,
          })
        }
      }
    } catch (err) {
      await releaseClaimOnFailure()
      if (isUpstreamAiError(err)) {
        throw new ApiError(502, RETRY_LATER_MESSAGE, 'AI_UPSTREAM_FAILED')
      }
      throw err
    }

    if (finalContent === null) {
      await releaseClaimOnFailure()
      const failCode =
        lastValidation && !lastValidation.ok ? lastValidation.code : 'UNKNOWN'
      console.error('[Horoscope Generate] output failed validation twice', {
        chartId,
        date: requestedDate,
        code: failCode,
      })
      throw new ApiError(502, RETRY_LATER_MESSAGE, 'AI_OUTPUT_INVALID')
    }

    void checkAndLogGeneration({
      source: 'horoscope',
      model: AI_MODEL,
      text: finalPlainText,
      conditions: generationConditions,
    })

    // .upsert() returns { error }, it does not throw — check it explicitly
    // so a silent cache-write failure is visible.
    const { error: saveError } = await supabase.from('daily_horoscopes').upsert(
      {
        chart_id: chartId,
        user_id: userId,
        date: requestedDate,
        content: finalContent,
        model_version: AI_MODEL,
      },
      { onConflict: 'chart_id,date' },
    )
    if (saveError) {
      console.error('[Horoscope Generate] Failed to save horoscope:', {
        chartId,
        date: requestedDate,
        error: saveError,
      })
    }

    return Response.json({
      content: finalContent,
      cached: false,
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return toErrorResponse(error, 'Failed to generate horoscope.')
  }
}
