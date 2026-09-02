import { auth } from '@clerk/nextjs/server'
import { generateText } from 'ai'
import { AI_MODEL, isUpstreamAiError, openrouter } from '@/lib/ai/client'
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
 * Streams an AI-generated natal chart reading via OpenRouter / Llama.
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
 * 11. Stream / generate via OpenRouter / Llama
 * 12. On failure: refund the claim (both tiers)
 */
export const maxDuration = 60

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

    // 11. Generate + validate before display.
    //
    // The Oracle no longer streams. The pre-display validator
    // (lib/ai/validate-reading.ts) must see the whole reading — script
    // purity, placeholder substitution and word count cannot be judged
    // token-by-token — so a full generateText call replaces the old
    // streamText path. The client already accepts a JSON `{ content }`
    // envelope (hooks/useOracleReading.ts handled it for the
    // already-cached short-circuit), so this needs no client change.
    //
    // On a validation failure we regenerate ONCE inside the same claim
    // (no second quota charge); a second failure refunds the claim and
    // returns a user-visible retry error rather than shipping broken text.
    async function generateRaw(): Promise<string> {
      const result = await generateText({
        model: openrouter(AI_MODEL),
        system: systemPrompt,
        prompt: chartPromptText,
        temperature: 0.85,
        maxOutputTokens: 2000,
      })
      return result.text
    }

    // finalContent keeps planet sentinels (stored + returned so the client
    // cross-highlights the wheel); finalPlainText is the sentinel-free
    // form fed to the spell-check logger.
    let finalContent: string | null = null
    let finalPlainText = ''
    let lastValidation: ReadingValidationResult | null = null
    try {
      for (let attempt = 1; attempt <= 2 && finalContent === null; attempt++) {
        const raw = await generateRaw()
        const validation = validateReading(raw, placeholderValues, {
          minWords: 400,
          maxWords: 700,
        })
        lastValidation = validation
        if (validation.ok) {
          finalContent = validation.content
          finalPlainText = validation.text
        } else {
          console.error('[Oracle Generate] reading rejected by validator', {
            attempt,
            code: validation.code,
            detail: validation.detail,
          })
        }
      }
    } catch (err) {
      await refundClaim()
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
      model: AI_MODEL,
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
        model_version: AI_MODEL,
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
