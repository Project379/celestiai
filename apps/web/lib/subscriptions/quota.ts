import * as Sentry from '@sentry/nextjs'
import { logAuditEvent } from '@/lib/audit'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { AppUser } from '@/lib/users/ensure-user'
import { pluralizeBg } from '@stellaeum/core/i18n/bg-grammar'

// SCOPE (frozen tier definition, 2026-09-01): this counter is now
// ORACLE-ONLY. It is no longer shared with /api/horoscope/generate — Днес
// is fully free with its own structural per-day ceiling (see that route's
// header). The two limits below govern the Oracle route only.
//
// FREE_MONTHLY_LIMIT: legacy value, kept for reference and for the
// horoscope quota-gate regression test's "not consumed" assertion. The
// FREE tier's real Oracle allowance is now ONE `general` reading for the
// LIFETIME of the account, enforced via users.free_oracle_used_at
// (apps/web/lib/subscriptions/free-oracle.ts), NOT via a monthly count.
// oracle/generate no longer routes free users through this month-scoped
// counter at all.
//
// PREMIUM_MONTHLY_LIMIT: 2026-08-26 sweep #4 (Tier 2) — premium was
// entirely unmetered on every AI path; the burst limiter was its
// only brake, so a scripted premium account could reach ~14,400
// generations/day. This is a SAFETY NET, not a product feature — see
// checkQuotaAvailable's premium branch below for why it must stay
// invisible to the user (503, no CAP_REACHED code, no number in the
// response). 300/month is ~10x realistic heavy usage (4 oracle topics
// with occasional regenerate) — no genuine paying user should reach it.
// Basis: Gemini 3.7 Flash Standard pricing and a representative Oracle
// request of ~1.3k input tokens with at most 900 configured output tokens.
// Even the configured-output ceiling keeps 300 successful calls below a
// few dollars per compromised account; actual short readings cost less.
// Re-derive this number if AI_MODEL (apps/web/lib/ai/client.ts) ever
// changes — the arithmetic it's based on changes with it.
export const FREE_MONTHLY_LIMIT = 3
export const PREMIUM_MONTHLY_LIMIT = 300

// Loud, explicit alert (Sentry.captureMessage, not just console) if a
// premium account crosses this many generations in one period — either a
// runaway client bug or a compromised account, and per founder ruling
// (2026-08-26) this must be known WHILE it's happening, not discovered from
// a support message, given the cap itself is invisible to the user by
// design. Plain console.error would NOT reach Sentry here: this repo's
// sentry.server.config.ts sets no console-capture integration and
// enableLogs: false, so only explicit Sentry calls land there — matching
// the sweep's §2.2 finding that server-side Sentry is the one surface that
// actually works.
const PREMIUM_ALERT_THRESHOLD = 200

export interface QuotaStatus {
  available: boolean
  used: number
  limit: number
  periodStart: Date
}

interface MonthPeriod {
  periodStart: string
  periodEnd: string
}

function getCurrentMonthPeriod(): MonthPeriod {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Sofia',
  }).format(new Date())
  const [yearStr, monthStr] = today.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  // new Date(year, month, 0) returns the last day of `month` (1-indexed via month, day 0 = last day prior)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    periodStart: `${yearStr}-${monthStr}-01`,
    periodEnd: `${yearStr}-${monthStr}-${String(lastDay).padStart(2, '0')}`,
  }
}

function periodStringToDate(periodStart: string): Date {
  return new Date(`${periodStart}T00:00:00Z`)
}

function dateToPeriodString(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Find or create the user's quota row for the current calendar month, and
 * sync its cap to `defaultLimit`.
 *
 * NOT ignoreDuplicates — the upsert payload includes only
 * (user_id, period_start, period_end, ai_readings_limit), so Postgres's
 * ON CONFLICT DO UPDATE SET only touches those columns (same semantics
 * relied on elsewhere in this codebase, e.g. the 2026-08-26 oracle
 * regenerate-cooldown fix); ai_readings_used is never in the payload, so a
 * repeat call never resets usage. This keeps a mid-period tier change
 * (free -> premium) reflected immediately rather than only from the next
 * period's fresh row.
 */
export async function getCurrentPeriodQuota(
  userId: string,
  defaultLimit: number,
): Promise<{
  used: number
  limit: number
  periodStart: string
}> {
  const supabase = createServiceSupabaseClient()
  const { periodStart, periodEnd } = getCurrentMonthPeriod()

  await supabase.from('subscription_quotas').upsert(
    {
      user_id: userId,
      period_start: periodStart,
      period_end: periodEnd,
      ai_readings_limit: defaultLimit,
    },
    { onConflict: 'user_id,period_start' },
  )

  const { data, error } = await supabase
    .from('subscription_quotas')
    .select('ai_readings_used, ai_readings_limit, period_start')
    .eq('user_id', userId)
    .eq('period_start', periodStart)
    .single()

  if (error || !data) {
    throw new Error(
      `[Quota] Failed to load quota row for ${userId} period ${periodStart}: ${error?.message ?? 'no row'}`,
    )
  }

  return {
    used: data.ai_readings_used,
    limit: data.ai_readings_limit,
    periodStart: data.period_start,
  }
}

/**
 * Pre-flight quota availability check.
 *
 * 2026-08-26 (Tier 2 #4): premium no longer short-circuits — it now shares
 * the exact same table/RPC as free tier, just with a much higher limit
 * (PREMIUM_MONTHLY_LIMIT) that's a safety net, not a product feature. Free
 * tier's limit is FREE_MONTHLY_LIMIT, same value the column default always
 * encoded, now passed explicitly so both tiers go through one code path.
 */
export async function checkQuotaAvailable(user: AppUser): Promise<QuotaStatus> {
  const defaultLimit = user.subscription_tier === 'premium' ? PREMIUM_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT
  const { used, limit, periodStart } = await getCurrentPeriodQuota(user.clerk_id, defaultLimit)
  return {
    available: used < limit,
    used,
    limit,
    periodStart: periodStringToDate(periodStart),
  }
}

/**
 * Builds the cap-reached HTTP response for a quota-gated AI route.
 * Centralizes the tier split ruled on 2026-08-26 (Tier 2 #4) so both
 * oracle/generate and horoscope/generate produce it identically:
 *
 * - Free tier: 429, CAP_REACHED code, the cap NUMBER included — this is a
 *   real, known, surfaced product limit; the UI is meant to show it.
 * - Premium tier: 503, no code, no number — indistinguishable from a real
 *   outage to the client BY DESIGN, because this is a safety net the user
 *   should never learn is a monthly cap (see the module doc comment
 *   above). Internally tagged `[Quota] premium safety-net cap reached` in
 *   the server log so it's greppable and distinguishable from a genuine
 *   outage without exposing that distinction to the client.
 */
export function quotaCapReachedResponse(user: AppUser, quota: QuotaStatus): Response {
  if (user.subscription_tier === 'premium') {
    console.error(
      `[Quota] premium safety-net cap reached for ${user.clerk_id} (${quota.used}/${quota.limit}) — returning 503, not surfaced to client`,
    )
    return Response.json(
      { error: 'Временно не успяваме да генерираме. Опитай отново след малко.' },
      { status: 503 },
    )
  }

  return Response.json(
    {
      error: `Достигна месечния лимит от ${quota.limit} ${pluralizeBg(quota.limit, 'четене', 'четения')}. Премиум абонаментът премахва ограничението.`,
      code: 'CAP_REACHED',
      cap: quota.limit,
      tier: user.subscription_tier,
    },
    { status: 429 },
  )
}

/**
 * Atomic conditional increment via the increment_quota_if_available
 * Postgres function. RPC returns the new ai_readings_used or NULL on
 * race-loss / cap-reached.
 *
 * Pattern B per B.0f-1 ratification: cap-claim happens BEFORE generation;
 * caller MUST handle success=false as cap-reached even if a prior
 * checkQuotaAvailable returned available=true (concurrent self-races can
 * exhaust capacity between check and increment). 2026-08-26 (Tier 2 #4):
 * premium now goes through this too, at PREMIUM_MONTHLY_LIMIT — no caller
 * should short-circuit around it anymore.
 */
export async function incrementQuotaUsage(
  userId: string,
  periodStart: Date,
): Promise<{ success: boolean; newUsed: number | null }> {
  const supabase = createServiceSupabaseClient()
  const { data, error } = await supabase.rpc('increment_quota_if_available', {
    p_user_id: userId,
    p_period_start: dateToPeriodString(periodStart),
  })

  if (error) {
    throw new Error(
      `[Quota] increment_quota_if_available RPC failed for ${userId}: ${error.message}`,
    )
  }

  if (data === null) {
    return { success: false, newUsed: null }
  }

  const newUsed = data as number

  // Free tier is capped at FREE_MONTHLY_LIMIT (3), structurally incapable
  // of ever reaching this threshold — so an unconditional check here only
  // ever fires for premium, without needing to thread tier through this
  // function. Explicit Sentry call, not console — see PREMIUM_ALERT_THRESHOLD
  // comment above for why console alone wouldn't be found.
  if (newUsed >= PREMIUM_ALERT_THRESHOLD) {
    console.error(
      `[Quota ALERT] ${userId} has used ${newUsed}/${PREMIUM_MONTHLY_LIMIT} AI generations this period — investigate for a runaway client or a compromised account.`,
    )
    try {
      Sentry.captureMessage('Premium AI quota nearing safety-net cap', {
        level: 'error',
        tags: { quotaAlert: 'premium_threshold', userId },
        extra: { used: newUsed, limit: PREMIUM_MONTHLY_LIMIT, threshold: PREMIUM_ALERT_THRESHOLD },
      })
    } catch (sentryErr) {
      console.error('[Quota ALERT] Sentry.captureMessage failed:', sentryErr)
    }
  }

  return { success: true, newUsed }
}

/**
 * Refund path via the decrement_quota_usage Postgres function. RPC
 * returns the new ai_readings_used (clamped at 0 by GREATEST), or NULL
 * when no row matched (row deleted between increment and refund —
 * extremely rare, would require user deletion mid-flight).
 *
 * Called from a generation route's error/finally branch when an
 * incrementQuotaUsage cap-claim was made but the generation itself
 * failed. On NULL return or RPC error, logs system.payment.quota_refund_failed
 * audit event and returns false; caller accepts silent under-grant per
 * B.0f-1 ratification rather than throw.
 */
export async function decrementQuotaUsage(
  userId: string,
  periodStart: Date,
): Promise<boolean> {
  const supabase = createServiceSupabaseClient()
  const periodStartStr = dateToPeriodString(periodStart)

  const { data, error } = await supabase.rpc('decrement_quota_usage', {
    p_user_id: userId,
    p_period_start: periodStartStr,
  })

  if (error) {
    await logAuditEvent(userId, 'system.payment.quota_refund_failed', {
      reason: 'rpc_error',
      periodStart: periodStartStr,
      error: error.message,
    })
    return false
  }

  if (data === null) {
    await logAuditEvent(userId, 'system.payment.quota_refund_failed', {
      reason: 'row_not_found',
      periodStart: periodStartStr,
    })
    return false
  }

  return true
}
