import { auth } from '@clerk/nextjs/server'
import { isUpstreamAiError, ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { aiTemporarilyUnavailableResponse, isTransientAIError } from '@/lib/ai/errors'
import { generateFinalText } from '@/lib/ai/generate-final-text'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { resolveReadingExpiry } from '@/lib/oracle/expiry'
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
import {
  claimFreeOracleReading,
  freeOracleGateResponse,
  releaseFreeOracleReading,
} from '@/lib/subscriptions/free-oracle'
import { ApiError, readJsonBody, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit, RETRY_LATER_MESSAGE } from '@/lib/rate-limit'

/**
 * POST /api/oracle/generate
 * Generates and persists an AI natal-chart reading via Google Gemini.
 *
 * TIER (frozen definition 2026-09-01):
 *  - FREE: ONE `general` reading for the LIFETIME of the account
 *    (users.free_oracle_used_at, apps/web/lib/subscriptions/free-oracle.ts).
 *    love/career/health are premium; regenerate is premium.
 *  - PREMIUM: all four topics, regenerate (24h cooldown/topic), and a
 *    300/month safety-net cap via subscription_quotas (invisible by
 *    design — see quota.ts). subscription_quotas is now Oracle-only; the
 *    daily horoscope no longer shares it.
 *
 * EXPIRY (2026-09-01): a free account's one `general` reading must stay
 * readable forever — it is the whole free tier, not a cache entry. It is
 * written with `expires_at = NEVER_EXPIRES_AT` so neither this route's
 * step-5 cache check nor GET /api/oracle/readings (both filter
 * `expires_at > now`) can ever drop it. Every other reading — all four
 * topics for premium, and love/career/health for anyone — keeps the
 * 7-day cache window. A row already marked non-expiring stays that way
 * across a tier change. Policy + the NEVER_EXPIRES_AT sentinel live in
 * apps/web/lib/oracle/expiry.ts (a route.ts file may export only
 * Next.js-recognised fields, so they cannot live here).
 *
 * Flow:
 * 1. Auth check
 * 2. Parse & validate body (chartId, topic, regenerate)
 * 3. Ensure app-user row + read AppUser shape (tier)
 * 4. Chart ownership verification
 * 5. Cache check — return cached reading without quota interaction
 * 6. Tier gates: premium-only topic, premium-only regenerate
 * 7. Regeneration rate limit (once per day per chart-topic pair)
 * 8. Claim: premium → monthly quota cap-claim; free → lifetime marker claim
 * 9. Load chart calculation data
 * 10. Build prompts from chart data
 * 11. Generate structured final output via Gemini 3.7, with an Oracle-only
 *     Gemini 3.6 fallback for transient provider failures
 * 12. On failure: refund the claim (both tiers)
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

  // Hoisted so both generation and setup failures can refund either kind of
  // claim. Set non-null / true only after a successful claim.
  let claimedPeriodStart: Date | null = null
  let claimedFreeOracle = false

  // Single idempotent refund entry point for setup, generation, and save
  // failures. It covers both premium monthly claims and free lifetime claims.
  async function refundClaim() {
    if (claimedPeriodStart) {
      await decrementQuotaUsage(userId!, claimedPeriodStart)
      claimedPeriodStart = null
    }
    if (claimedFreeOracle) {
      await releaseFreeOracleReading(userId!)
      claimedFreeOracle = false
    }
  }

  try {
    // Burst guard, defense-in-depth alongside the caps and the 24h regen
    // cooldown below. failClosed (2026-08-26 sweep #17): this route calls a
    // paid Gemini model.
    await assertRateLimit({
      key: `oracle-generate:${userId}`,
      limit: ORACLE_GENERATION_RATE_LIMIT,
      windowMs: ORACLE_GENERATION_RATE_WINDOW_MS,
      failClosed: true,
    })

    // 2. Parse and validate body
    const body = await readJsonBody(req)
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

    // 3. Ensure app-user row + read AppUser shape (tier).
    const user = await ensureUserRecord(userId)
    const isPremium = user.subscription_tier === 'premium'

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

    // 5. Cache check — return cached reading without any quota / gate
    //    interaction (a reading already generated stays viewable even if
    //    the user's tier has since changed).
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
    // quota when there is an actual existing reading being regenerated.
    const isRegenerationOfExisting = Boolean(regenerate && existingReading)

    // 6. Tier gates (frozen definition 2026-09-01). Both use
    //    `code: 'CAP_REACHED'` so the existing client mapping routes them
    //    to the conversion surface; `reason` picks the copy.
    if (!isPremium && validatedTopic !== 'general') {
      return freeOracleGateResponse('premium_topic')
    }
    if (!isPremium && isRegenerationOfExisting) {
      return freeOracleGateResponse('premium_regenerate')
    }

    // 7. Regeneration rate limit — once per day per chart-topic pair
    //    (premium only reaches here; free is blocked at step 6).
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

    // 8. Claim before generation. Regenerations of an existing live cached
    //    reading are exempt from both claims (premium-only path).
    if (!isRegenerationOfExisting) {
      if (isPremium) {
        // 8a. Premium — monthly safety-net cap (invisible by design).
        const quota = await checkQuotaAvailable(user)
        if (!quota.available) {
          return quotaCapReachedResponse(user, quota)
        }
        const claim = await incrementQuotaUsage(userId, quota.periodStart)
        if (!claim.success) {
          return quotaCapReachedResponse(user, quota)
        }
        claimedPeriodStart = quota.periodStart
      } else {
        // 8b. Free — one `general` reading, lifetime. Atomic conditional
        //     UPDATE on users.free_oracle_used_at. `claimed: false` means
        //     it has already been spent.
        const claim = await claimFreeOracleReading(userId)
        if (!claim.claimed) {
          return freeOracleGateResponse('free_used')
        }
        claimedFreeOracle = true
      }
    }

    // 9. Load chart calculation data
    const { data: calculation, error: calcError } = await supabase
      .from('chart_calculations')
      .select(
        'planet_positions, house_cusps, aspects, ascendant, mc, birth_time_known'
      )
      .eq('chart_id', chartId)
      .single()

    if (calcError || !calculation) {
      // Refund the cap-claim — no generation will happen.
      await refundClaim()
      return Response.json(
        { error: 'Натална карта не е изчислена. Изчисли картата първо.' },
        { status: 404 }
      )
    }

    // 10. Build prompts
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

    // 11. Buffer a structured final response before exposing it. This keeps
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
      const expiresAt = resolveReadingExpiry(generatedAt, {
        isPremium,
        topic: validatedTopic,
        previousExpiresAt: existingReading?.expires_at ?? null,
      })
      const { error: saveError } = await supabase.from('ai_readings').upsert(
        {
          chart_id: chartId,
          user_id: userId,
          topic: validatedTopic,
          content: cleanContent,
          generated_at: generatedAt.toISOString(),
          expires_at: expiresAt,
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
      await refundClaim()
      if (isTransientAIError(err)) {
        return aiTemporarilyUnavailableResponse()
      }
      if (isUpstreamAiError(err)) {
        return toErrorResponse(
          new ApiError(502, RETRY_LATER_MESSAGE, 'AI_UPSTREAM_FAILED'),
          'AI upstream failure',
        )
      }
      return toErrorResponse(err, 'Грешка при генериране на четенето')
    }
  } catch (error) {
    // Setup error before generation. Refund either claim type exactly once.
    await refundClaim()
    return toErrorResponse(error, 'Грешка при генериране на четенето')
  }
}
