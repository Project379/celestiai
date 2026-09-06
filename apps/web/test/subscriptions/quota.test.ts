import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUser } from '@/lib/users/ensure-user'

interface MockSupabase {
  from: ReturnType<typeof vi.fn>
  rpc: ReturnType<typeof vi.fn>
}

let mockSupabase: MockSupabase
let upsertResult: { error: { message: string } | null }
let selectSingleResult: {
  data: { ai_readings_used: number; ai_readings_limit: number; period_start: string } | null
  error: { message: string } | null
}
let rpcResult: { data: number | null; error: { message: string } | null }

function createMockSupabase(): MockSupabase {
  return {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve(upsertResult)),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve(selectSingleResult)),
          })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve(rpcResult)),
  }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(() => mockSupabase),
}))

const logAuditEvent = vi.fn()
vi.mock('@/lib/audit', () => ({
  logAuditEvent: (...args: unknown[]) => logAuditEvent(...args),
}))

const captureMessage = vi.fn()
vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => captureMessage(...args),
}))

const {
  FREE_MONTHLY_LIMIT,
  PREMIUM_MONTHLY_LIMIT,
  checkQuotaAvailable,
  quotaCapReachedResponse,
  incrementQuotaUsage,
  decrementQuotaUsage,
} = await import('@/lib/subscriptions/quota')

function makeUser(tier: 'free' | 'premium'): AppUser {
  return {
    id: 'row_1',
    clerk_id: 'user_1',
    subscription_tier: tier,
    subscription_status: 'active',
    subscription_provider: tier === 'premium' ? 'stripe' : 'none',
    created_at: null,
    updated_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_expires_at: null,
    trial_claimed_at: null,
    deleted_at: null,
    deletion_scheduled_at: null,
  } as AppUser
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  upsertResult = { error: null }
  selectSingleResult = {
    data: { ai_readings_used: 0, ai_readings_limit: FREE_MONTHLY_LIMIT, period_start: '2026-09-01' },
    error: null,
  }
  rpcResult = { data: 1, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('checkQuotaAvailable', () => {
  it('uses FREE_MONTHLY_LIMIT as the default cap for a free user', async () => {
    selectSingleResult = {
      data: { ai_readings_used: 0, ai_readings_limit: FREE_MONTHLY_LIMIT, period_start: '2026-09-01' },
      error: null,
    }
    const status = await checkQuotaAvailable(makeUser('free'))
    expect(status.limit).toBe(FREE_MONTHLY_LIMIT)
    expect(status.available).toBe(true)
  })

  it('uses PREMIUM_MONTHLY_LIMIT as the default cap for a premium user', async () => {
    selectSingleResult = {
      data: { ai_readings_used: 0, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-09-01' },
      error: null,
    }
    const status = await checkQuotaAvailable(makeUser('premium'))
    expect(status.limit).toBe(PREMIUM_MONTHLY_LIMIT)
  })

  it('reports unavailable once used reaches the limit (used < limit boundary)', async () => {
    selectSingleResult = {
      data: { ai_readings_used: FREE_MONTHLY_LIMIT, ai_readings_limit: FREE_MONTHLY_LIMIT, period_start: '2026-09-01' },
      error: null,
    }
    const status = await checkQuotaAvailable(makeUser('free'))
    expect(status.available).toBe(false)
  })

  it('reports available one unit below the limit', async () => {
    selectSingleResult = {
      data: { ai_readings_used: FREE_MONTHLY_LIMIT - 1, ai_readings_limit: FREE_MONTHLY_LIMIT, period_start: '2026-09-01' },
      error: null,
    }
    const status = await checkQuotaAvailable(makeUser('free'))
    expect(status.available).toBe(true)
  })

  it('throws when the quota row cannot be loaded', async () => {
    selectSingleResult = { data: null, error: { message: 'row not found' } }
    await expect(checkQuotaAvailable(makeUser('free'))).rejects.toThrow(/Failed to load quota row/)
  })
})

describe('quotaCapReachedResponse', () => {
  it('free tier: 429 with CAP_REACHED code and the cap number exposed', async () => {
    const res = quotaCapReachedResponse(makeUser('free'), {
      available: false,
      used: FREE_MONTHLY_LIMIT,
      limit: FREE_MONTHLY_LIMIT,
      periodStart: new Date('2026-09-01'),
    })
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.cap).toBe(FREE_MONTHLY_LIMIT)
  })

  it('premium tier: 503, no code, no cap number — indistinguishable from a real outage by design', async () => {
    const res = quotaCapReachedResponse(makeUser('premium'), {
      available: false,
      used: PREMIUM_MONTHLY_LIMIT,
      limit: PREMIUM_MONTHLY_LIMIT,
      periodStart: new Date('2026-09-01'),
    })
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.code).toBeUndefined()
    expect(body.cap).toBeUndefined()
    expect(String(body.error)).not.toMatch(/\d/) // no leaked limit number in the message
  })

  it('pluralizes the Bulgarian cap message correctly at n=1 vs n>1', async () => {
    const singular = await quotaCapReachedResponse(makeUser('free'), {
      available: false,
      used: 1,
      limit: 1,
      periodStart: new Date('2026-09-01'),
    }).json()
    expect(singular.error).toContain('четене')
    expect(singular.error).not.toContain('четения')

    const plural = await quotaCapReachedResponse(makeUser('free'), {
      available: false,
      used: 3,
      limit: 3,
      periodStart: new Date('2026-09-01'),
    }).json()
    expect(plural.error).toContain('четения')
  })
})

describe('incrementQuotaUsage', () => {
  it('returns success with the new count on a normal claim', async () => {
    rpcResult = { data: 2, error: null }
    const result = await incrementQuotaUsage('user_1', new Date('2026-09-01'))
    expect(result).toEqual({ success: true, newUsed: 2 })
  })

  it('returns success: false on a race-loss / cap-reached NULL from the RPC', async () => {
    rpcResult = { data: null, error: null }
    const result = await incrementQuotaUsage('user_1', new Date('2026-09-01'))
    expect(result).toEqual({ success: false, newUsed: null })
  })

  it('throws when the RPC itself errors', async () => {
    rpcResult = { data: null, error: { message: 'db down' } }
    await expect(incrementQuotaUsage('user_1', new Date('2026-09-01'))).rejects.toThrow(
      /increment_quota_if_available RPC failed/,
    )
  })

  it('fires a Sentry alert once newUsed reaches PREMIUM_ALERT_THRESHOLD (200)', async () => {
    rpcResult = { data: 200, error: null }
    await incrementQuotaUsage('user_1', new Date('2026-09-01'))
    expect(captureMessage).toHaveBeenCalledTimes(1)
    expect(captureMessage).toHaveBeenCalledWith(
      'Premium AI quota nearing safety-net cap',
      expect.objectContaining({ level: 'error' }),
    )
  })

  it('does not fire the Sentry alert just below the threshold (199)', async () => {
    rpcResult = { data: 199, error: null }
    await incrementQuotaUsage('user_1', new Date('2026-09-01'))
    expect(captureMessage).not.toHaveBeenCalled()
  })

  it('swallows a Sentry.captureMessage failure rather than throwing (the claim already succeeded)', async () => {
    rpcResult = { data: 200, error: null }
    captureMessage.mockImplementation(() => {
      throw new Error('Sentry is down')
    })
    const result = await incrementQuotaUsage('user_1', new Date('2026-09-01'))
    expect(result).toEqual({ success: true, newUsed: 200 })
  })
})

describe('decrementQuotaUsage', () => {
  it('returns true on a successful refund', async () => {
    rpcResult = { data: 1, error: null }
    await expect(decrementQuotaUsage('user_1', new Date('2026-09-01'))).resolves.toBe(true)
    expect(logAuditEvent).not.toHaveBeenCalled()
  })

  it('returns false and logs an audit event when the RPC errors', async () => {
    rpcResult = { data: null, error: { message: 'db down' } }
    await expect(decrementQuotaUsage('user_1', new Date('2026-09-01'))).resolves.toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user_1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'rpc_error' }),
    )
  })

  it('returns false and logs an audit event when no row matched (NULL, no error)', async () => {
    rpcResult = { data: null, error: null }
    await expect(decrementQuotaUsage('user_1', new Date('2026-09-01'))).resolves.toBe(false)
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user_1',
      'system.payment.quota_refund_failed',
      expect.objectContaining({ reason: 'row_not_found' }),
    )
  })
})
