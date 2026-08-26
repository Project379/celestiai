import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Tests lib/subscriptions/quota.ts — the monthly AI-reading cap shared by
 * /api/oracle/generate and /api/horoscope/generate. Tests the actual gate
 * logic (tier-appropriate limit selection, free-tier availability, atomic
 * race-loss handling, refund-failure logging), not an assumed "quota
 * system" shape.
 *
 * 2026-08-26 (Tier 2 #4): premium no longer short-circuits — it shares
 * this exact table/RPC at PREMIUM_MONTHLY_LIMIT instead of
 * FREE_MONTHLY_LIMIT. See quota.ts's module doc comment for why.
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
  it('premium users share the same subscription_quotas gate as free tier, at PREMIUM_MONTHLY_LIMIT instead of FREE_MONTHLY_LIMIT', async () => {
    const user = makeAppUser({ subscription_tier: 'premium' })
    mockSupabase.push('subscription_quotas', { data: null }) // upsert result, ignored
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 5, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-08-01' },
    })

    const status = await checkQuotaAvailable(user)

    expect(status).toMatchObject({ available: true, used: 5, limit: PREMIUM_MONTHLY_LIMIT })
    // The upsert (first 'subscription_quotas' call) must pass the
    // premium-tier limit explicitly, not rely on the free-tier column
    // default.
    const upsertCall = mockSupabase.from.mock.results[0].value
    expect(upsertCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ ai_readings_limit: PREMIUM_MONTHLY_LIMIT }),
      expect.anything(),
    )
  })

  it('premium users are blocked once used reaches PREMIUM_MONTHLY_LIMIT — the safety net actually caps', async () => {
    const user = makeAppUser({ subscription_tier: 'premium' })
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-08-01',
      },
    })

    const status = await checkQuotaAvailable(user)

    expect(status.available).toBe(false)
  })

  it('free users with used < limit are available:true', async () => {
    const user = makeAppUser({ subscription_tier: 'free' })
    mockSupabase.push('subscription_quotas', { data: null }) // upsert result, ignored
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 2, ai_readings_limit: 3, period_start: '2026-08-01' },
    })

    const status = await checkQuotaAvailable(user)

    expect(status).toMatchObject({ available: true, used: 2, limit: 3 })
  })

  it('free users with used === limit are available:false — the boundary is exclusive, not "used <= limit"', async () => {
    const user = makeAppUser({ subscription_tier: 'free' })
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', {
      data: { ai_readings_used: 3, ai_readings_limit: 3, period_start: '2026-08-01' },
    })

    const status = await checkQuotaAvailable(user)

    expect(status.available).toBe(false)
  })

  it('throws when the quota row cannot be loaded even after the find-or-create upsert — a silent free-pass here would let a free user bypass the cap entirely', async () => {
    const user = makeAppUser({ subscription_tier: 'free' })
    mockSupabase.push('subscription_quotas', { data: null })
    mockSupabase.push('subscription_quotas', { data: null, error: { message: 'row missing' } })

    await expect(checkQuotaAvailable(user)).rejects.toThrow()
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

describe('quotaCapReachedResponse — tier-specific shape (ruled 2026-08-26, Tier 2 #4)', () => {
  it('free tier: 429, CAP_REACHED code, the cap number IS in the payload — a real, surfaced product limit', async () => {
    const user = makeAppUser({ subscription_tier: 'free' })
    const res = quotaCapReachedResponse(user, {
      available: false,
      used: 3,
      limit: 3,
      periodStart: new Date('2026-08-01'),
    })

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.cap).toBe(3)
  })

  it('premium tier: 503, no code, no cap number — must be indistinguishable from a real outage to the client, by design', async () => {
    const user = makeAppUser({ subscription_tier: 'premium' })
    const res = quotaCapReachedResponse(user, {
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
