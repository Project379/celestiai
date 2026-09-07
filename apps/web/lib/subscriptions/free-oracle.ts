import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * Lifetime "one free Oracle reading" gate for the FREE tier.
 *
 * Frozen tier definition (2026-09-01): a free account gets ONE `general`
 * Oracle reading for the lifetime of the account — not per month. The
 * monthly `subscription_quotas` counter (apps/web/lib/subscriptions/
 * quota.ts) is premium-only and cannot express "once, ever" (its PK is
 * (user_id, period_start)).
 *
 * Backed by users.free_oracle_used_at (migration
 * 20260901120000_free_oracle_used_at.sql). NULL = still available; a
 * timestamp = spent.
 *
 * DARK-LAUNCH TOLERANCE (fail-OPEN): every function here treats the column
 * being absent (Postgres undefined_column / SQLSTATE 42703) as "the reading
 * is available" and no-ops. This let the application ship ahead of the
 * hand-applied migration (the ledger is unreconciled, so the column was
 * added out-of-band) — the lifetime cap started being enforced the moment
 * the column existed. The column is confirmed present in production as of
 * 2026-09-08, so this branch is now insurance against an accidental column
 * drop, not a live gap.
 *
 * It stays fail-open on purpose: a 42703 here is our schema mistake, and
 * failing closed would deny every free user their one reading over an
 * internal error — worse for users, and no louder for us than the Sentry
 * error below. The blast radius of fail-open is bounded (each free user
 * gets at most one extra `general` reading until the column is restored)
 * and now visible immediately. If that tradeoff is ever revisited, this
 * comment and warnMissingColumnOnce are the two places to change.
 *
 * ESCALATION (2026-09-08): the absence is reported to Sentry at level
 * 'error', once per process — a silently unenforced paid boundary must be
 * loud. console.warn alone never reached Sentry (sentry.server.config.ts
 * captures no console output), so this was previously invisible.
 */

let missingColumnWarned = false

function isUndefinedColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  if (error.code === '42703') return true
  return Boolean(error.message && /free_oracle_used_at/.test(error.message) && /does not exist|column/.test(error.message))
}

function warnMissingColumnOnce(where: string) {
  if (missingColumnWarned) return
  missingColumnWarned = true
  const message =
    `[free-oracle] users.free_oracle_used_at is absent (${where}) — failing OPEN: the free Oracle reading is being handed out WITHOUT enforcing the lifetime cap. Apply/restore migration 20260901120000_free_oracle_used_at.sql.`
  console.warn(message)
  try {
    Sentry.captureMessage(message, {
      level: 'error',
      tags: { freeOracle: 'column_missing_fail_open', where },
    })
  } catch (sentryErr) {
    console.error('[free-oracle] Sentry.captureMessage failed:', sentryErr)
  }
}

export interface FreeOracleClaim {
  /** True = the caller may proceed with generation. */
  claimed: boolean
  /** True = the column does not exist yet; `claimed` was forced true. */
  columnMissing: boolean
}

/**
 * Atomically claim the free reading: conditional UPDATE that only
 * succeeds while free_oracle_used_at IS NULL. Call BEFORE generation.
 * A caller that gets { claimed: false } must return the gate response
 * (freeOracleGateResponse('free_used')) — it means the reading is spent.
 *
 * On generation failure, call releaseFreeOracleReading() to clear it.
 */
export async function claimFreeOracleReading(clerkUserId: string): Promise<FreeOracleClaim> {
  const supabase = createServiceSupabaseClient()

  const { data, error } = await supabase
    .from('users')
    .update({ free_oracle_used_at: new Date().toISOString() })
    .eq('clerk_id', clerkUserId)
    .is('free_oracle_used_at', null)
    .select('clerk_id')

  if (error) {
    if (isUndefinedColumn(error)) {
      warnMissingColumnOnce('claim')
      return { claimed: true, columnMissing: true }
    }
    // A real DB error — fail closed (do not hand out a free reading we
    // can't account for). The route surfaces this as a generic error.
    throw new Error(`[free-oracle] claim failed for ${clerkUserId}: ${error.message}`)
  }

  // 1 row updated => we just claimed it. 0 rows => already spent (or the
  // user row is missing, which ensureUserRecord upstream rules out).
  return { claimed: (data?.length ?? 0) > 0, columnMissing: false }
}

/**
 * Refund path — clear the marker so a failed generation doesn't burn the
 * user's one free reading. Best-effort: swallows its own errors (mirrors
 * decrementQuotaUsage's posture — an un-refunded claim is a minor
 * under-grant, not worth throwing over).
 */
export async function releaseFreeOracleReading(clerkUserId: string): Promise<void> {
  const supabase = createServiceSupabaseClient()

  const { error } = await supabase
    .from('users')
    .update({ free_oracle_used_at: null })
    .eq('clerk_id', clerkUserId)

  if (error) {
    if (isUndefinedColumn(error)) {
      warnMissingColumnOnce('release')
    } else {
      console.error(`[free-oracle] release (refund) failed for ${clerkUserId}:`, error.message)
    }
  }
}

export type FreeOracleGateReason = 'free_used' | 'premium_topic' | 'premium_regenerate'

/**
 * The response a free user gets when they hit an Oracle boundary that
 * premium removes. Uses `code: 'CAP_REACHED'` so the existing client
 * mapping in useOracleReading (web + mobile) already routes it to the
 * conversion surface; `reason` lets that surface pick the right copy.
 * `cap: 1` matches the free lifetime allowance.
 */
export function freeOracleGateResponse(reason: FreeOracleGateReason): Response {
  const messages: Record<FreeOracleGateReason, string> = {
    free_used:
      'Това беше безплатното ти тълкуване от Оракула. С Премиум получаваш неограничени тълкувания по всички теми.',
    premium_topic:
      'Любов, кариера и здраве са теми за Премиум. Личностното тълкуване остава безплатно.',
    premium_regenerate:
      'Ново тълкуване има само в Премиум.',
  }

  return Response.json(
    {
      error: messages[reason],
      code: 'CAP_REACHED',
      reason,
      cap: 1,
      tier: 'free',
    },
    { status: 429 },
  )
}
