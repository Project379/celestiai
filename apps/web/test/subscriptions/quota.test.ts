import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests lib/subscriptions/quota.ts — the premium-only monthly AI-reading
 * safety net shared by /api/oracle/generate and /api/horoscope/generate.
 * Exercises the real gate logic: PREMIUM_MONTHLY_LIMIT selection, the
 * used<limit availability boundary, the find-or-create upsert payload, the
 * atomic race-loss handling, the runaway-account Sentry alert, and the
 * refund-failure audit logging.
 *
 * 2026-09-09: consolidated from two ~70%-duplicate suites (this file's
 * former hand-rolled-mock version + test/oracle/quota.test.ts) into one
 * suite against one module. Standardised on the shared ../mocks/supabase
 * helper. Net test count 27 -> 16.
 *
 * 2026-09-01 (frozen tier definition): the FREE tier's one lifetime
 * `general` reading is gated by users.free_oracle_used_at, NOT this
 * counter — oracle/generate step 8 calls this module only inside
 * `if (isPremium)`. 2026-09-08: the free arm of checkQuotaAvailable /
 * quotaCapReachedResponse and the FREE_MONTHLY_LIMIT constant were removed
 * as unreachable; checkQuotaAvailable now takes a bare userId.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import {
  checkQuotaAvailable,
  decrementQuotaUsage,
  incrementQuotaUsage,
  PREMIUM_MONTHLY_LIMIT,
  quotaCapReachedResponse,
} from '@/lib/subscriptions/quota'

// Module-private in quota.ts; asserted here as a literal so a change to the
// runaway-account alert boundary trips this test deliberately.
const PREMIUM_ALERT_THRESHOLD = 200

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// quota.ts is PREMIUM-ONLY since the 2026-09-01 frozen tier definition.
// checkQuotaAvailable takes a bare userId and always applies
// PREMIUM_MONTHLY_LIMIT. getCurrentPeriodQuota does a find-or-create upsert
// then a select().single() — two FIFO reads against 'subscription_quotas'.
describe('checkQuotaAvailable', () => {
  it('passes PREMIUM_MONTHLY_LIMIT explicitly to the find-or-create upsert (not relying on a column default)', async () => {
    mockSupabase.push('subscription_quotas', { data: null }) // upsert result, ignored
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 5, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-09-01' },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status).toMatchObject({ available: true, used: 5, limit: PREMIUM_MONTHLY_LIMIT })
    const upsertCall = mockSupabase.from.mock.results[0].value
    expect(upsertCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ai_readings_limit: PREMIUM_MONTHLY_LIMIT }),
      expect.anything(),
    )
  })

  it('used < limit → available:true', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 2, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-09-01' },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status).toMatchObject({ available: true, used: 2, limit: PREMIUM_MONTHLY_LIMIT })
  })

  it('used === limit → available:false — the boundary is exclusive, not "used <= limit"; the safety net actually caps', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-09-01',
      },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status.available).toBe(false)
  })

  it('reports available exactly one unit below the limit', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT - 1,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-09-01',
      },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status.available).toBe(true)
  })

  it('throws when the quota row cannot be loaded even after the find-or-create upsert — a silent free-pass here would bypass the cap entirely', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', { data: null, error: { message: 'row not found' } })

    await expect(checkQuotaAvailable('user-1')).rejects.toThrow(/Failed to load quota row/)
  })
})

describe('quotaCapReachedResponse', () => {
  it('premium safety net: 503, no code, no cap number — indistinguishable from a real outage to the client, by design (ruled 2026-08-26, Tier 2 #4)', async () => {
    const res = quotaCapReachedResponse('user-1', {
      available: false,
      used: PREMIUM_MONTHLY_LIMIT,
      limit: PREMIUM_MONTHLY_LIMIT,
      periodStart: new Date('2026-09-01'),
    })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBeUndefined()
    expect(body.cap).toBeUndefined()
    expect(JSON.stringify(body)).not.toMatch(/\d/) // no number anywhere in the payload
  })
})

describe('incrementQuotaUsage', () => {
  it('returns success:true with the new count on a normal claim', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: 2 })

    const result = await incrementQuotaUsage('user-1', new Date('2026-09-01'))

    expect(result).toEqual({ success: true, newUsed: 2 })
  })

  it('treats a NULL RPC return as a race-loss (success:false), not an error — the concurrent-self-race case, not a failure path', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: null })

    const result = await incrementQuotaUsage('user-1', new Date('2026-09-01'))

    expect(result).toEqual({ success: false, newUsed: null })
  })

  it('throws (does not silently grant) when the RPC itself errors — a throw-vs-swallow bug here would grant free generations on DB errors', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: null, error: { message: 'db down' } })

    await expect(incrementQuotaUsage('user-1', new Date('2026-09-01'))).rejects.toThrow(
      /increment_quota_if_available RPC failed/,
    )
  })

  it('sends periodStart as a plain YYYY-MM-DD string, not an ISO timestamp, to the RPC — a mismatched format would silently miss the period row', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: 1 })

    await incrementQuotaUsage('user-1', new Date('2026-09-01T15:30:00Z'))

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_quota_if_available', {
      p_user_id: 'user-1',
      p_period_start: '2026-09-01',
    })
  })

  it('fires a Sentry alert once newUsed reaches PREMIUM_ALERT_THRESHOLD (200)', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: PREMIUM_ALERT_THRESHOLD })

    await incrementQuotaUsage('user-1', new Date('2026-09-01'))

    expect(Sentry.captureMessage).toHaveBeenCalledTimes(1)
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Premium AI quota nearing safety-net cap',
      expect.objectContaining({ level: 'error' }),
    )
  })

  it('does not fire the Sentry alert just below the threshold (199)', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: PREMIUM_ALERT_THRESHOLD - 1 })

    await incrementQuotaUsage('user-1', new Date('2026-09-01'))

    expect(Sentry.captureMessage).not.toHaveBeenCalled()
  })

  it('swallows a Sentry.captureMessage failure rather than throwing (the claim already succeeded)', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: PREMIUM_ALERT_THRESHOLD })
    vi.mocked(Sentry.captureMessage).mockImplementation(() => {
      throw new Error('Sentry is down')
    })

    const result = await incrementQuotaUsage('user-1', new Date('2026-09-01'))

    expect(result).toEqual({ success: true, newUsed: PREMIUM_ALERT_THRESHOLD })
  })
})

describe('decrementQuotaUsage', () => {
  it('returns true on a successful refund and logs no audit event', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: 1 })

    await expect(decrementQuotaUsage('user-1', new Date('2026-09-01'))).resolves.toBe(true)
    expect(logAuditEvent).not.toHaveBeenCalled()
  })

  it('returns false and logs a quota_refund_failed audit event (reason: rpc_error) on RPC error — swallows rather than throws, per the documented "accept silent under-grant" ratification', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: null, error: { message: 'db down' } })

    await expect(decrementQuotaUsage('user-1', new Date('2026-09-01'))).resolves.toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'rpc_error' }),
    )
  })

  it('returns false and logs row_not_found (distinct reason) when the RPC returns NULL without erroring', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: null })

    await expect(decrementQuotaUsage('user-1', new Date('2026-09-01'))).resolves.toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'row_not_found' }),
    )
  })
})
