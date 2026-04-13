import { getSqlClient } from '@celestia/db/sql'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import { TIER_LIMITS, type SubscriptionTier } from './constants'

export interface QuotaResult {
  allowed: boolean
  limit: number
  used: number
  resetAt: Date
}

export interface QuotaSummary {
  limit: number
  used: number
  resetAt: Date
}

interface QuotaRow {
  ai_readings_used: number
  ai_readings_limit: number
  period_end: string
}

function currentCalendarPeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
    resetAt: end,
  }
}

function tierLimit(tier: string) {
  return TIER_LIMITS[(tier === 'premium' ? 'premium' : 'free') as SubscriptionTier]
    .ai_readings
}

export async function getOrCreateQuotaForCurrentPeriod(
  userId: string
): Promise<QuotaSummary> {
  const user = await ensureUserRecord(userId)
  const limit = tierLimit(user.subscription_tier)
  const { periodStart, periodEnd, resetAt } = currentCalendarPeriod()
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase
    .from('subscription_quotas')
    .upsert(
      {
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
        ai_readings_limit: limit === -1 ? 0 : limit,
      },
      {
        onConflict: 'user_id,period_start',
        ignoreDuplicates: true,
      }
    )
    .select('ai_readings_used, ai_readings_limit, period_end')
    .single()

  if (error || !data) {
    const { data: existing, error: selectError } = await supabase
      .from('subscription_quotas')
      .select('ai_readings_used, ai_readings_limit, period_end')
      .eq('user_id', userId)
      .eq('period_start', periodStart)
      .single()

    if (selectError || !existing) {
      throw new Error(
        `[Quota] Failed to load quota for ${userId}: ${
          selectError?.message ?? error?.message ?? 'missing row'
        }`
      )
    }

    return {
      limit,
      used: existing.ai_readings_used,
      resetAt: new Date(existing.period_end),
    }
  }

  return {
    limit,
    used: data.ai_readings_used,
    resetAt,
  }
}

export async function consumeQuota(userId: string): Promise<QuotaResult> {
  const user = await ensureUserRecord(userId)
  const limit = tierLimit(user.subscription_tier)
  const { periodStart, periodEnd, resetAt } = currentCalendarPeriod()

  if (limit === -1) {
    return { allowed: true, limit, used: 0, resetAt }
  }

  await getOrCreateQuotaForCurrentPeriod(userId)

  const sql = getSqlClient()
  const rows = await sql<QuotaRow[]>`
    UPDATE public.subscription_quotas
    SET ai_readings_used = ai_readings_used + 1,
        ai_readings_limit = ${limit},
        period_end = ${periodEnd}::date,
        updated_at = now()
    WHERE user_id = ${userId}
      AND period_start = ${periodStart}::date
      AND ai_readings_used < ai_readings_limit
    RETURNING ai_readings_used, ai_readings_limit, period_end
  `

  const updated = rows[0]
  if (!updated) {
    return { allowed: false, limit, used: limit, resetAt }
  }

  return {
    allowed: true,
    limit: updated.ai_readings_limit,
    used: updated.ai_readings_used,
    resetAt: new Date(updated.period_end),
  }
}

export async function getQuotaSummary(userId: string): Promise<QuotaSummary> {
  return getOrCreateQuotaForCurrentPeriod(userId)
}
