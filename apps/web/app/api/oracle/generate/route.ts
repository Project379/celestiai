import { auth } from '@clerk/nextjs/server'
import { generateText, streamText } from 'ai'
import { AI_MODEL, openrouter } from '@/lib/ai/client'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { stripSentinels } from '@stellaeum/core/oracle/planet-parser'
import { pluralizeBg } from '@stellaeum/core/i18n/bg-grammar'
import type { ChartData } from '@stellaeum/astrology/client'
import type { ReadingTopic } from '@/lib/oracle/prompts'
import { logAuditEvent } from '@/lib/audit'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import {
  checkQuotaAvailable,
  decrementQuotaUsage,
  incrementQuotaUsage,
} from '@/lib/subscriptions/quota'

/**
 * POST /api/oracle/generate
 * Streams an AI-generated natal chart reading via OpenRouter / Llama.
 *
 * Flow (post-B.0f-2 quota refactor 2026-05-10):
 * 1. Auth check
 * 2. Parse & validate body (chartId, topic, regenerate)
 * 3. Ensure app-user row + read AppUser shape
 * 4. Chart ownership verification
 * 5. Cache check — return cached reading without quota interaction
 *    (cache hits do NOT count against the monthly cap)
 * 6. Regeneration rate limit (once per day per chart-topic pair)
 * 7. Quota cap-claim (Pattern B, monthly cap from subscription_quotas):
 *    7a. checkQuotaAvailable — premium short-circuits, free reads
 *        the current period row for { used, limit, periodStart }
 *    7b. incrementQuotaUsage — atomic conditional UPDATE before Llama
 *        call. Race-loss returns 429 same as cap-reached. Premium skips.
 * 8. Load chart calculation data
 * 9. Build prompts from chart data
 * 10. Stream / generate via OpenRouter / Llama
 * 11. onFinish / await: upsert completed reading into ai_readings
 * 12. On any failure in 10–11: decrementQuotaUsage refund (free tier only)
 */
export const maxDuration = 60

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']

export async function POST(req: Request) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  // Hoisted so refund paths in the outer catch + stream callbacks can see it.
  // Set non-null only after a successful cap-claim against a free-tier row.
  let claimedPeriodStart: Date | null = null

  try {
    // 2. Parse and validate body
    const body = await req.json()
    const { chartId, topic, regenerate } = body as {
      chartId?: string
      topic?: string
      regenerate?: boolean
    }

    if (!chartId || typeof chartId !== 'string') {
      return Response.json({ error: 'Невалиден chartId' }, { status: 400 })
    }

    if (!topic || !VALID_TOPICS.includes(topic as ReadingTopic)) {
      return Response.json(
        { error: 'Невалидна тема. Допустими: general, love, career, health' },
        { status: 400 }
      )
    }

    const validatedTopic = topic as ReadingTopic
    const url = new URL(req.url)
    const jsonOnly = url.searchParams.get('format') === 'json'
    const supabase = createServiceSupabaseClient()

    // 3. Ensure app-user row + read AppUser shape. Replaces the prior raw
    //    upsert + tier-read; ensureUserRecord handles brand-new-user
    //    creation idempotently and returns the AppUser shape that the
    //    quota helpers expect.
    const user = await ensureUserRecord(userId)

    // 4. Chart ownership verification
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

    // 5. Cache check — return cached reading without quota interaction
    const now = new Date().toISOString()
    const { data: existingReading } = await supabase
      .from('ai_readings')
      .select('id, content, generated_at, expires_at, last_regenerated_at')
      .eq('chart_id', chartId)
      .eq('topic', validatedTopic)
      .gt('expires_at', now)
      .single()

    if (existingReading && !regenerate) {
      return Response.json({
        content: existingReading.content,
        cached: true,
        generatedAt: existingReading.generated_at,
      })
    }

    // 6. Regeneration rate limit — once per day per chart-topic pair
    if (regenerate && existingReading?.last_regenerated_at) {
      const lastRegen = new Date(existingReading.last_regenerated_at)
      const hoursElapsed =
        (Date.now() - lastRegen.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed < 24) {
        return Response.json(
          { error: 'Можете да регенерирате веднъж на ден' },
          { status: 429 }
        )
      }
    }

    // 7. Quota cap-claim (Pattern B). Regenerations are exempt per
    //    B.0f-2-fix-1 ratification — they fall through directly to the
    //    chart-load step, no checkQuotaAvailable, no incrementQuotaUsage.
    //    The 24-hour regenerate rate-limit at step 6 still applies.
    if (!regenerate) {
      // 7a. Pre-flight quota check. Premium short-circuits with available=true;
      //     free path reads the current period row for { used, limit, periodStart }.
      const quota = await checkQuotaAvailable(user)
      if (!quota.available) {
        return Response.json(
          {
            error: `Достигна месечния лимит от ${quota.limit} ${pluralizeBg(quota.limit, 'четене', 'четения')}. Премиум абонаментът премахва ограничението.`,
            code: 'CAP_REACHED',
            cap: quota.limit,
            tier: user.subscription_tier,
          },
          { status: 429 }
        )
      }

      // 7b. Atomic cap-claim BEFORE generation. Premium has no quota row
      //     by D1 — skip the increment. Free tier increments via RPC;
      //     race-loss (NULL return) is treated as cap-reached.
      if (user.subscription_tier !== 'premium') {
        const claim = await incrementQuotaUsage(userId, quota.periodStart)
        if (!claim.success) {
          return Response.json(
            {
              error: `Достигна месечния лимит от ${quota.limit} ${pluralizeBg(quota.limit, 'четене', 'четения')}. Премиум абонаментът премахва ограничението.`,
              code: 'CAP_REACHED',
              cap: quota.limit,
              tier: user.subscription_tier,
            },
            { status: 429 }
          )
        }
        claimedPeriodStart = quota.periodStart
      }
    }

    // 8. Load chart calculation data
    const { data: calculation, error: calcError } = await supabase
      .from('chart_calculations')
      .select(
        'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
      )
      .eq('chart_id', chartId)
      .single()

    if (calcError || !calculation) {
      // Refund the cap-claim — no generation will happen.
      if (claimedPeriodStart) {
        await decrementQuotaUsage(userId, claimedPeriodStart)
      }
      return Response.json(
        { error: 'Натална карта не е изчислена. Моля, изчислете картата първо.' },
        { status: 404 }
      )
    }

    // 9. Build prompts
    const chartData: ChartData = {
      planets: calculation.planet_positions as ChartData['planets'],
      houses: calculation.house_cusps as ChartData['houses'],
      aspects: calculation.aspects as ChartData['aspects'],
      ascendant: calculation.ascendant as ChartData['ascendant'],
      mc: calculation.mc as ChartData['mc'],
      birthTimeKnown: calculation.birth_time_known,
    }

    const systemPrompt = buildSystemPrompt(validatedTopic)
    const chartPromptText = chartToPromptText(chartData)

    logAuditEvent(userId, 'data.ai_reading', { chartId, topic: validatedTopic })

    // Astrological conditions only — no chartId/userId. Feeds the
    // bg_generation_flags safety net (observes, never corrects).
    const generationConditions = {
      topic: validatedTopic,
      sunSign: chartData.planets.find((p) => p.planet === 'sun')?.sign,
      aspects: chartData.aspects.map((a) => ({
        planet1: a.planet1,
        planet2: a.planet2,
        aspect: a.aspect,
      })),
    }

    // 10a. Mobile path — non-streaming JSON response. Mirrors the
    //      ?format=json branch in /api/horoscope/generate added in
    //      sub-round 5.3 (REVISIT-TRIGGERS item 20 logs the streaming
    //      polish for mobile). react-native-sse is finicky on iOS so
    //      mobile collects the full text and renders once. Web's
    //      streaming path stays untouched below.
    if (jsonOnly) {
      try {
        const result = await generateText({
          model: openrouter(AI_MODEL),
          system: systemPrompt,
          prompt: chartPromptText,
          temperature: 0.85,
          maxOutputTokens: 2000,
        })

        const cleanContent = stripSentinels(result.text)

        void checkAndLogGeneration({
          source: 'oracle',
          model: AI_MODEL,
          text: cleanContent,
          conditions: generationConditions,
        })

        const generatedAt = new Date()
        const expiresAt = new Date(generatedAt)
        expiresAt.setDate(expiresAt.getDate() + 7)

        await supabase.from('ai_readings').upsert(
          {
            chart_id: chartId,
            user_id: userId,
            topic: validatedTopic,
            content: cleanContent,
            generated_at: generatedAt.toISOString(),
            expires_at: expiresAt.toISOString(),
            last_regenerated_at: regenerate ? generatedAt.toISOString() : null,
            model_version: AI_MODEL,
          },
          { onConflict: 'chart_id,topic' }
        )

        return Response.json({
          content: cleanContent,
          cached: false,
          generatedAt: generatedAt.toISOString(),
        })
      } catch (err) {
        if (claimedPeriodStart) {
          await decrementQuotaUsage(userId, claimedPeriodStart)
        }
        console.error('[Oracle Generate] Failed to save reading:', err)
        return Response.json(
          { error: 'Грешка при запазване на четенето' },
          { status: 500 }
        )
      }
    }

    // 10b. Web path — stream via OpenRouter / meta-llama/llama-3.3-70b-instruct.
    //      Refund hook captured as a const for closure clarity (the let above
    //      is also visible, but const here documents that callbacks won't be
    //      racing further mutation).
    const refundPeriodStart = claimedPeriodStart
    const result = streamText({
      model: openrouter(AI_MODEL),
      system: systemPrompt,
      prompt: chartPromptText,
      temperature: 0.85,
      maxOutputTokens: 2000,

      // onFinish: upsert completed reading into ai_readings
      onFinish: async ({ text }) => {
        try {
          const cleanContent = stripSentinels(text)

          void checkAndLogGeneration({
            source: 'oracle',
            model: AI_MODEL,
            text: cleanContent,
            conditions: generationConditions,
          })
          const generatedAt = new Date()
          const expiresAt = new Date(generatedAt)
          expiresAt.setDate(expiresAt.getDate() + 7)

          await supabase.from('ai_readings').upsert(
            {
              chart_id: chartId,
              user_id: userId,
              topic: validatedTopic,
              content: cleanContent,
              generated_at: generatedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
              last_regenerated_at: regenerate
                ? generatedAt.toISOString()
                : null,
              model_version: AI_MODEL,
            },
            {
              onConflict: 'chart_id,topic',
            }
          )
        } catch (err) {
          console.error('[Oracle Generate] Failed to save reading:', err)
          if (refundPeriodStart) {
            await decrementQuotaUsage(userId, refundPeriodStart)
          }
        }
      },

      onError: ({ error }) => {
        console.error('[Oracle Generate] Stream error:', error)
        if (refundPeriodStart) {
          // Fire-and-forget; decrementQuotaUsage swallows its own errors
          // and audits via system.payment.quota_refund_failed when needed.
          void decrementQuotaUsage(userId, refundPeriodStart)
        }
      },
    })

    // result.consumeStream() drains the LLM stream server-side regardless of
    // client connection state. Guarantees onFinish fires (persisting the
    // reading to ai_readings cache) even when the user navigates away
    // mid-stream. Combined with no abortSignal: the upstream Llama call also
    // runs to completion, so a fully-formed cached reading is available on
    // user retry. Trade: slot consumed on abort, but content remains
    // available via cache for the user to revisit. Documented Vercel AI SDK
    // pattern. The jsonOnly path inherits the same semantics automatically
    // via the await + no-abortSignal pattern (server-side await completes
    // regardless of client disconnect; no consumeStream equivalent needed
    // for non-streaming generateText). See B.0f-2-fix-2 close note.
    result.consumeStream()

    return result.toTextStreamResponse()
  } catch (error) {
    // Setup error before stream returned. If we already cap-claimed, refund.
    if (claimedPeriodStart) {
      await decrementQuotaUsage(userId, claimedPeriodStart)
    }
    console.error('[Oracle Generate] Unhandled error:', error)
    return Response.json(
      { error: 'Грешка при генериране на четенето' },
      { status: 500 }
    )
  }
}
