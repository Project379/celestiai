import { logAuditEvent } from '@/lib/audit'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import type { AppUser } from '@/lib/users/ensure-user'

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
 * Find or create the user's quota row for the current calendar month.
 * Idempotent — INSERT … ON CONFLICT DO NOTHING then SELECT.
 *
 * Always finds-or-creates; premium-agnostic. Caller (checkQuotaAvailable)
 * short-circuits for premium users so this never runs for them — premium
 * tier per D1 has no quota row.
 */
export async function getCurrentPeriodQuota(userId: string): Promise<{
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
    },
    { onConflict: 'user_id,period_start', ignoreDuplicates: true },
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
 * Premium short-circuits without DB touch. Free path finds-or-creates the
 * current period row and compares used < limit. Caller uses { used, limit }
 * for the cap-reached 429 body when available is false. periodStart is the
 * captured key that incrementQuotaUsage / decrementQuotaUsage need so the
 * cap-claim and any refund target the same row even if the calendar rolls
 * over mid-request.
 */
export async function checkQuotaAvailable(user: AppUser): Promise<QuotaStatus> {
  if (user.subscription_tier === 'premium') {
    return {
      available: true,
      used: 0,
      limit: 0,
      periodStart: periodStringToDate(getCurrentMonthPeriod().periodStart),
    }
  }

  const { used, limit, periodStart } = await getCurrentPeriodQuota(user.clerk_id)
  return {
    available: used < limit,
    used,
    limit,
    periodStart: periodStringToDate(periodStart),
  }
}

/**
 * Atomic conditional increment via the increment_quota_if_available
 * Postgres function. RPC returns the new ai_readings_used or NULL on
 * race-loss / cap-reached.
 *
 * Pattern B per B.0f-1 ratification: cap-claim happens BEFORE generation;
 * caller MUST handle success=false as 429 cap-reached even if a prior
 * checkQuotaAvailable returned available=true (concurrent self-races can
 * exhaust capacity between check and increment). Premium users should not
 * reach this — caller short-circuits via tier check.
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

  return { success: true, newUsed: data as number }
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
