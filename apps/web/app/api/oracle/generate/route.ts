import { auth } from '@clerk/nextjs/server'
import { AI_MODEL, isUpstreamAiError, ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { aiTemporarilyUnavailableResponse, isTransientAIError } from '@/lib/ai/errors'
import { generateFinalText } from '@/lib/ai/generate-final-text'
import { checkAndLogGeneration } from '@/lib/ai/check-bg-output'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { buildSystemPrompt } from '@/lib/oracle/prompts'
import { buildOraclePlaceholderValues, chartToPromptText } from '@/lib/oracle/chart-to-prompt'
import { validateReading, type ReadingValidationResult } from '@/lib/ai/validate-reading'
import { resolveReadingExpiry } from '@/lib/oracle/expiry'
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
 * Generates and validates an AI natal chart reading via Google Gemini.
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
 * 11. Generate (Gemini, with same-provider transient fallback) + validate
 * 12. On failure: refund the claim (both tiers)
 *
 * RETRY SHAPE (11), reconciled from change-ai-to-bulgarian-fluent onto the
 * injection/validation layer — two independent retry axes composed, not
 * multiplied:
 *   - generateFinalText() (lib/ai/generate-final-text.ts) owns the
 *     TRANSPORT axis: one call to AI_MODEL (Gemini 3.7), and — only on a
 *     transient/upstream failure — one fallback call to
 *     ORACLE_FALLBACK_MODEL (Gemini 3.6). At most 2 model calls per
 *     generateFinalText() invocation. It also runs sanitizeFinalAIOutput()
 *     internally before returning text, so the caller always sees
 *     reasoning-leakage-stripped output.
 *   - The `for (attempt 1..2)` loop below owns the QUALITY axis: a
 *     validateReading() failure (bad word count, script impurity, a
 *     model-authored digit, an unresolved token) retries the WHOLE
 *     generateFinalText() call once, same shape.
 * Worst case: 2 quality attempts x 2 model calls each = 4 model calls. If
 * generateFinalText() itself throws all the way through (both its own
 * calls failed), that exception breaks the attempt loop immediately — it
 * is NOT retried a second time by the quality loop, so 4 is a hard
 * ceiling, not just a typical case. Each observed Gemini call in this
 * environment (Gate 9 tooling, INFERRED from the equivalent Llama runs
 * this environment can measure) has run well under 60s; even a generous
 * 40s/call estimate puts 4 sequential calls at ~160s, comfortably inside
 * the 300s ceiling below with headroom for validation + DB writes.
 */
// 300s = the Vercel Pro ceiling. Worst case is 4 sequential model calls
// (see the RETRY SHAPE note above) plus validation and DB writes; 60s did
// not leave headroom for even a single transient-failure retry.
export const maxDuration = 300

const VALID_TOPICS: ReadingTopic[] = ['general', 'love', 'career', 'health']

export async function POST(req: Request) {
  // 1. Auth check
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  // Hoisted so refund paths in the outer catch + stream callbacks can see
  // them. Set non-null / true only after a successful cap-claim.
  let claimedPeriodStart: Date | null = null
  let claimedFreeOracle = false

  // Single refund entry point for the synchronous setup paths. The stream
  // callbacks capture their own copies below (they run after this function
  // has returned) so they don't call this.
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
    // paid OpenRouter model.
    await assertRateLimit({
      key: `oracle-generate:${userId}`,
      limit: 10,
      windowMs: 60_000,
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

    // 10. Build prompts + deterministic placeholder map
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
    const placeholderValues = buildOraclePlaceholderValues(chartData)

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

    // 11. Generate + validate before display. See the RETRY SHAPE comment
    // above the maxDuration export for the composed retry axes.
    //
    // STELLAEUM_PLACEHOLDER: ORACLE-WORD-BAND — 100-250 derived from 11 live
    // samples; re-verify at scale. See .planning/PLACEHOLDERS.md
    // WORD-COUNT BAND (100-250): derived from the FORMAT rule in
    // lib/oracle/prompts.ts. Gemini's FORMAT section (ported from
    // change-ai-to-bulgarian-fluent) targets 800-1200 CHARACTERS across 6-8
    // sentences — much shorter than the 7-9 PARAGRAPH target the OLD
    // 300-800-word band was derived from (Llama). CORRECTED 2026-09-03
    // after Gate 9 measured live Gemini output: an earlier version of this
    // comment claimed 300-800 "does not reject" the new shorter target —
    // that was wrong, and unverified when written. Live Gate 9 output
    // (6 successful generations, one run) measured 126-164 words — EVERY
    // ONE of them below the old 300 floor, i.e. the old band would have
    // rejected 100% of real Gemini readings and driven the free-tier
    // Oracle to its regenerate-twice-then-fail-visibly path on every
    // request. 100-250 gives headroom on both sides of the observed
    // 126-164 range at the same proportional generosity as the original
    // band. Re-verify against a larger Gate 9 sample before trusting this
    // long-term — six generations is a small sample.
    let finalContent: string | null = null
    let finalPlainText = ''
    let servedModel: string = AI_MODEL
    let lastValidation: ReadingValidationResult | null = null
    try {
      for (let attempt = 1; attempt <= 2 && finalContent === null; attempt++) {
        const { model, text } = await generateFinalText({
          system: systemPrompt,
          prompt: chartPromptText,
          maxOutputTokens: 900,
          fallbackModel: ORACLE_FALLBACK_MODEL,
        })
        servedModel = model
        // `text` is already sanitizeFinalAIOutput()-cleaned by
        // generateFinalText — validateReading sees the reasoning-leakage-
        // stripped text, per the ordering this reconciliation requires.
        const validation = validateReading(text, placeholderValues, {
          minWords: 100,
          maxWords: 250,
        })
        lastValidation = validation
        if (validation.ok) {
          finalContent = validation.content
          finalPlainText = validation.text
        } else {
          console.error('[Oracle Generate] reading rejected by validator', {
            attempt,
            model: servedModel,
            code: validation.code,
            detail: validation.detail,
          })
        }
      }
    } catch (err) {
      await refundClaim()
      // isTransientAIError first — the more specific, chain-aware
      // classifier (also used inside generateFinalText to decide the
      // fallback-model switch). A transient failure that ALSO exhausted
      // generateFinalText's own fallback lands here with a distinct 503,
      // not lumped into the generic 502 below.
      if (isTransientAIError(err)) {
        return aiTemporarilyUnavailableResponse()
      }
      if (isUpstreamAiError(err)) {
        return toErrorResponse(
          new ApiError(502, RETRY_LATER_MESSAGE, 'AI_UPSTREAM_FAILED'),
          'AI upstream failure',
        )
      }
      console.error('[Oracle Generate] generation threw:', err)
      return Response.json(
        { error: 'Грешка при генериране на четенето' },
        { status: 500 },
      )
    }

    if (finalContent === null) {
      await refundClaim()
      const failCode =
        lastValidation && !lastValidation.ok ? lastValidation.code : 'UNKNOWN'
      return toErrorResponse(
        new ApiError(502, RETRY_LATER_MESSAGE, 'AI_OUTPUT_INVALID'),
        `Oracle output failed validation twice (${failCode})`,
      )
    }

    void checkAndLogGeneration({
      source: 'oracle',
      model: servedModel,
      text: finalPlainText,
      conditions: generationConditions,
    })

    const generatedAt = new Date()
    const expiresAt = resolveReadingExpiry(generatedAt, {
      isPremium,
      topic: validatedTopic,
      previousExpiresAt: existingReading?.expires_at ?? null,
    })

    // SECURITY FIX (2026-08-26 sweep #14): a fresh (non-regeneration)
    // generation must NOT touch last_regenerated_at — omit it from the
    // upsert so the existing value survives on conflict.
    const { error: saveError } = await supabase.from('ai_readings').upsert(
      {
        chart_id: chartId,
        user_id: userId,
        topic: validatedTopic,
        content: finalContent,
        generated_at: generatedAt.toISOString(),
        expires_at: expiresAt,
        ...(isRegenerationOfExisting
          ? { last_regenerated_at: generatedAt.toISOString() }
          : {}),
        model_version: servedModel,
      },
      { onConflict: 'chart_id,topic' },
    )
    if (saveError) {
      console.error('[Oracle Generate] Failed to save reading:', {
        chartId,
        topic: validatedTopic,
        error: saveError,
      })
    }

    return Response.json({
      content: finalContent,
      cached: false,
      generatedAt: generatedAt.toISOString(),
    })
  } catch (error) {
    // Setup error before the response was returned. If we already claimed, refund.
    await refundClaim()
    return toErrorResponse(error, 'Грешка при генериране на четенето')
  }
}
