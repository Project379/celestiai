import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests lib/subscriptions/quota.ts — the premium-only monthly AI-reading
 * safety net for /api/oracle/generate. Tests the actual gate logic
 * (PREMIUM_MONTHLY_LIMIT selection, used<limit availability boundary,
 * atomic race-loss handling, refund-failure logging), not an assumed
 * "quota system" shape.
 *
 * 2026-09-01 (frozen tier definition): the FREE tier's one lifetime
 * `general` reading is gated by users.free_oracle_used_at, NOT this
 * counter. oracle/generate step 8 calls this module only inside
 * `if (isPremium)`. 2026-09-08: the free arm of checkQuotaAvailable /
 * quotaCapReachedResponse and the FREE_MONTHLY_LIMIT constant were removed
 * as unreachable — checkQuotaAvailable now takes a bare userId.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import {
  checkQuotaAvailable,
  decrementQuotaUsage,
  incrementQuotaUsage,
  PREMIUM_MONTHLY_LIMIT,
  quotaCapReachedResponse,
} from '@/lib/subscriptions/quota'

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('checkQuotaAvailable', () => {
  it('passes PREMIUM_MONTHLY_LIMIT explicitly to the find-or-create upsert (not relying on a column default)', async () => {
    mockSupabase.push('subscription_quotas', { data: null }) // upsert result, ignored
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 5, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-08-01' },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status).toMatchObject({ available: true, used: 5, limit: PREMIUM_MONTHLY_LIMIT })
    const upsertCall = mockSupabase.from.mock.results[0].value
    expect(upsertCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ai_readings_limit: PREMIUM_MONTHLY_LIMIT }),
      expect.anything(),
    )
  })

  it('blocks once used reaches PREMIUM_MONTHLY_LIMIT — the safety net actually caps', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-08-01',
      },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status.available).toBe(false)
  })

  it('used < limit → available:true', async () => {
    mockSupabase.push('subscription_quotas', { data: null }) // upsert result, ignored
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 2, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-08-01' },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status).toMatchObject({ available: true, used: 2, limit: PREMIUM_MONTHLY_LIMIT })
  })

  it('used === limit → available:false — the boundary is exclusive, not "used <= limit"', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-08-01',
      },
    })

    const status = await checkQuotaAvailable('user-1')

    expect(status.available).toBe(false)
  })

  it('throws when the quota row cannot be loaded even after the find-or-create upsert — a silent free-pass here would bypass the cap entirely', async () => {
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', { data: null, error: { message: 'row missing' } })

    await expect(checkQuotaAvailable('user-1')).rejects.toThrow()
  })
})

describe('incrementQuotaUsage', () => {
  it('returns success:true with the new count on a normal claim', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: 3 })

    const result = await incrementQuotaUsage('user-1', new Date('2026-08-01'))

    expect(result).toEqual({ success: true, newUsed: 3 })
  })

  it('treats a NULL RPC return as a race-loss (success:false), not an error — this is the concurrent-self-race case the docstring calls out, not a failure path', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: null })

    const result = await incrementQuotaUsage('user-1', new Date('2026-08-01'))

    expect(result).toEqual({ success: false, newUsed: null })
  })

  it('throws (does not silently grant) when the RPC itself errors — an unnoticed throw-vs-swallow bug here would grant free generations on DB errors', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: null, error: { message: 'timeout' } })

    await expect(incrementQuotaUsage('user-1', new Date('2026-08-01'))).rejects.toThrow()
  })

  it('sends periodStart as a plain YYYY-MM-DD string, not an ISO timestamp, to the RPC — a mismatched format would silently miss the period row', async () => {
    mockSupabase.pushRpc('increment_quota_if_available', { data: 1 })

    await incrementQuotaUsage('user-1', new Date('2026-08-01T15:30:00Z'))

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_quota_if_available', {
      p_user_id: 'user-1',
      p_period_start: '2026-08-01',
    })
  })
})

describe('decrementQuotaUsage', () => {
  it('returns true on a normal refund', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: 2 })

    const result = await decrementQuotaUsage('user-1', new Date('2026-08-01'))

    expect(result).toBe(true)
  })

  it('returns false and logs a quota_refund_failed audit event on RPC error — swallows rather than throws, per the documented "accept silent under-grant" ratification', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: null, error: { message: 'timeout' } })

    const result = await decrementQuotaUsage('user-1', new Date('2026-08-01'))

    expect(result).toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'rpc_error' }),
    )
  })

  it('returns false and logs row_not_found (distinct reason) when the RPC returns NULL without erroring', async () => {
    mockSupabase.pushRpc('decrement_quota_usage', { data: null })

    const result = await decrementQuotaUsage('user-1', new Date('2026-08-01'))

    expect(result).toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'row_not_found' }),
    )
  })
})

describe('quotaCapReachedResponse — premium safety net (ruled 2026-08-26, Tier 2 #4)', () => {
  it('503, no code, no cap number — must be indistinguishable from a real outage to the client, by design', async () => {
    const res = quotaCapReachedResponse('user-1', {
      available: false,
      used: PREMIUM_MONTHLY_LIMIT,
      limit: PREMIUM_MONTHLY_LIMIT,
      periodStart: new Date('2026-08-01'),
    })

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBeUndefined()
    expect(body.cap).toBeUndefined()
    expect(JSON.stringify(body)).not.toMatch(/\d/) // no number anywhere in the payload
  })
})
