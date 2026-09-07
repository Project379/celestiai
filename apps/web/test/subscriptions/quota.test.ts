import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  PREMIUM_MONTHLY_LIMIT,
  checkQuotaAvailable,
  quotaCapReachedResponse,
  incrementQuotaUsage,
  decrementQuotaUsage,
} = await import('@/lib/subscriptions/quota')

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  upsertResult = { error: null }
  selectSingleResult = {
    data: { ai_readings_used: 0, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-09-01' },
    error: null,
  }
  rpcResult = { data: 1, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

// quota.ts is PREMIUM-ONLY since the 2026-09-01 frozen tier definition —
// the free tier's one lifetime reading is gated by users.free_oracle_used_at,
// not this counter. checkQuotaAvailable takes a bare userId and always
// applies PREMIUM_MONTHLY_LIMIT.
describe('checkQuotaAvailable', () => {
  it('applies PREMIUM_MONTHLY_LIMIT as the cap', async () => {
    selectSingleResult = {
      data: { ai_readings_used: 0, ai_readings_limit: PREMIUM_MONTHLY_LIMIT, period_start: '2026-09-01' },
      error: null,
    }
    const status = await checkQuotaAvailable('user_1')
    expect(status.limit).toBe(PREMIUM_MONTHLY_LIMIT)
    expect(status.available).toBe(true)
  })

  it('reports unavailable once used reaches the limit (used < limit boundary, exclusive)', async () => {
    selectSingleResult = {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-09-01',
      },
      error: null,
    }
    const status = await checkQuotaAvailable('user_1')
    expect(status.available).toBe(false)
  })

  it('reports available one unit below the limit', async () => {
    selectSingleResult = {
      data: {
        ai_readings_used: PREMIUM_MONTHLY_LIMIT - 1,
        ai_readings_limit: PREMIUM_MONTHLY_LIMIT,
        period_start: '2026-09-01',
      },
      error: null,
    }
    const status = await checkQuotaAvailable('user_1')
    expect(status.available).toBe(true)
  })

  it('throws when the quota row cannot be loaded', async () => {
    selectSingleResult = { data: null, error: { message: 'row not found' } }
    await expect(checkQuotaAvailable('user_1')).rejects.toThrow(/Failed to load quota row/)
  })
})

describe('quotaCapReachedResponse', () => {
  it('premium safety net: 503, no code, no cap number — indistinguishable from a real outage by design', async () => {
    const res = quotaCapReachedResponse('user_1', {
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
