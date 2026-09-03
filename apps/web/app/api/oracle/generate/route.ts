import { auth } from '@clerk/nextjs/server'
import { ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { aiTemporarilyUnavailableResponse, isTransientAIError } from '@/lib/ai/errors'
import { generateFinalText } from '@/lib/ai/generate-final-text'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { stripSentinels } from '@stellaeum/core/oracle/planet-parser'
import type { ChartData } from '@stellaeum/astrology/client'
import type { ReadingTopic } from '@/lib/oracle/prompts'
import { logAuditEvent } from '@/lib/audit'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import {
  checkQuotaAvailable,
  decrementQuotaUsage,
  incrementQuotaUsage,
  quotaCapReachedResponse,
} from '@/lib/subscriptions/quota'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/oracle/generate
 * Generates and persists an AI natal-chart reading via Google Gemini.
 *
 * Flow (post-B.0f-2 quota refactor 2026-05-10):
 * 1. Auth check
 * 2. Parse & validate body (chartId, topic, regenerate)
 * 3. Ensure app-user row + read AppUser shape
 * 4. Chart ownership verification
 * 5. Cache check — return cached reading without quota interaction
 *    (cache hits do NOT count against the monthly cap)
 * 6. Regeneration rate limit (once per day per chart-topic pair)
 * 7. Quota cap-claim (Pattern B, monthly cap from subscription_quotas).
 *    2026-08-26 (Tier 2 #4): premium goes through this too now, at a much
 *    higher safety-net limit (PREMIUM_MONTHLY_LIMIT) — see quota.ts's
 *    module doc comment for why and quotaCapReachedResponse for the
 *    tier-specific response shape (free: 429 + number; premium: 503,
 *    invisible by design).
 *    7a. checkQuotaAvailable — reads the current period row for
 *        { used, limit, periodStart }, tier-appropriate limit.
 *    7b. incrementQuotaUsage — atomic conditional UPDATE before the Gemini
 *        call. Race-loss treated as cap-reached, same as 7a.
 * 8. Load chart calculation data
 * 9. Build prompts from chart data
 * 10. Generate a structured final response via Google Gemini
 * 11. Upsert the completed reading into ai_readings
 * 12. On any failure in 10–11: decrementQuotaUsage refund (both tiers)
 */
export const maxDuration = 60

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']
export const ORACLE_GENERATION_RATE_LIMIT = 5
export const ORACLE_GENERATION_RATE_WINDOW_MS = 60_000

export async function POST(req: Request) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  // Hoisted so both generation and setup failures can refund the cap-claim.
  // Set non-null only after a successful cap-claim.
  let claimedPeriodStart: Date | null = null

  try {
    // Burst guard, defense-in-depth alongside the monthly quota cap and the
    // 24h regen cooldown below — neither of those blocks a rapid-fire burst
    // within a single window the way this does.
    // failClosed (2026-08-26 sweep #17): this route calls a paid Gemini
    // model. A Supabase-degradation fail-open here would remove the burst
    // brake on a real-money route while the monthly quota cap (which
    // throws, not fails open, on its own DB errors) is the only other
    // control left.
    await assertRateLimit({
      key: `oracle-generate:${userId}`,
      limit: ORACLE_GENERATION_RATE_LIMIT,
      windowMs: ORACLE_GENERATION_RATE_WINDOW_MS,
      failClosed: true,
    })

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
      return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 403 })
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

    // SECURITY FIX (2026-08-14, Batch 5.5 #1): `regenerate` must only exempt
    // quota when there is an actual existing reading being regenerated — the
    // B.0f-2-fix-1 exemption was gated on the client-supplied `regenerate`
    // flag alone, not on `existingReading` truthiness. Since `existingReading`
    // is only populated for a non-expired cache hit, a free-tier user sending
    // regenerate:true for any chart/topic with no live cached reading (never
    // generated, or past the 7-day TTL) skipped both the 24h cooldown below
    // AND the quota check/claim entirely — unlimited free paid AI calls. The
    // fix: treat this as a real "regeneration" (quota-exempt, cooldown-gated)
    // only when existingReading is present; otherwise it's functionally a
    // fresh generation and must go through quota like any other.
    const isRegenerationOfExisting = Boolean(regenerate && existingReading)

    // 6. Regeneration rate limit — once per day per chart-topic pair
    if (isRegenerationOfExisting && existingReading?.last_regenerated_at) {
      const lastRegen = new Date(existingReading.last_regenerated_at)
      const hoursElapsed =
        (Date.now() - lastRegen.getTime()) / (1000 * 60 * 60)
      if (hoursElapsed < 24) {
        return Response.json(
          { error: 'Можеш да регенерираш веднъж на ден' },
          { status: 429 }
        )
      }
    }

    // 7. Quota cap-claim (Pattern B). Regenerations of an existing, live
    //    cached reading are exempt per B.0f-2-fix-1 ratification — they fall
    //    through directly to the chart-load step, no checkQuotaAvailable, no
    //    incrementQuotaUsage. The 24-hour regenerate rate-limit at step 6
    //    still applies. Anything else (no existing reading to regenerate)
    //    goes through quota regardless of the regenerate flag — see the
    //    isRegenerationOfExisting fix above.
    if (!isRegenerationOfExisting) {
      // 7a. Pre-flight quota check. 2026-08-26 (Tier 2 #4): premium no
      //     longer short-circuits — it shares this exact gate at a much
      //     higher (safety-net) limit. See quotaCapReachedResponse for the
      //     tier-specific response shape.
      const quota = await checkQuotaAvailable(user)
      if (!quota.available) {
        return quotaCapReachedResponse(user, quota)
      }

      // 7b. Atomic cap-claim BEFORE generation, for both tiers now.
      //     Race-loss (NULL return) is treated as cap-reached.
      const claim = await incrementQuotaUsage(userId, quota.periodStart)
      if (!claim.success) {
        return quotaCapReachedResponse(user, quota)
      }
      claimedPeriodStart = quota.periodStart
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
        { error: 'Натална карта не е изчислена. Изчисли картата първо.' },
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

    // 10. Buffer a structured final response before exposing it. This keeps
    // model self-talk out of the Oracle UI and makes a clean model fallback
    // possible: 3.7 is attempted once, then 3.6 once only for transient
    // provider failures. No request abort signal is forwarded, so closing the
    // panel or navigating away does not cancel generation or persistence.
    try {
      const { model: servedModel, text } = await generateFinalText({
        system: systemPrompt,
        prompt: chartPromptText,
        maxOutputTokens: 900,
        fallbackModel: ORACLE_FALLBACK_MODEL,
      })

      const cleanContent = stripSentinels(text)
      void checkAndLogGeneration({
        source: 'oracle',
        model: servedModel,
        text: cleanContent,
        conditions: generationConditions,
      })

      const generatedAt = new Date()
      const expiresAt = new Date(generatedAt)
      expiresAt.setDate(expiresAt.getDate() + 7)
      const { error: saveError } = await supabase.from('ai_readings').upsert(
        {
          chart_id: chartId,
          user_id: userId,
          topic: validatedTopic,
          content: cleanContent,
          generated_at: generatedAt.toISOString(),
          expires_at: expiresAt.toISOString(),
          ...(isRegenerationOfExisting
            ? { last_regenerated_at: generatedAt.toISOString() }
            : {}),
          model_version: servedModel,
        },
        { onConflict: 'chart_id,topic' },
      )
      if (saveError) throw saveError

      if (jsonOnly) {
        return Response.json({
          content: cleanContent,
          cached: false,
          generatedAt: generatedAt.toISOString(),
        })
      }

      return new Response(text, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'X-AI-Model': servedModel,
        },
      })
    } catch (err) {
      if (claimedPeriodStart) {
        await decrementQuotaUsage(userId, claimedPeriodStart)
      }
      if (isTransientAIError(err)) {
        return aiTemporarilyUnavailableResponse()
      }
      console.error('[Oracle Generate] Failed to generate or save reading:', err)
      return Response.json(
        { error: 'Грешка при генериране на четенето' },
        { status: 500 },
      )
    }
  } catch (error) {
    // Setup error before generation. If we already cap-claimed, refund.
    if (claimedPeriodStart) {
      await decrementQuotaUsage(userId, claimedPeriodStart)
    }
    return toErrorResponse(error, 'Грешка при генериране на четенето')
  }
}
