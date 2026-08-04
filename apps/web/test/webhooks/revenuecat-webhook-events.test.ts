import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Event-dispatch tests for apps/web/lib/revenuecat/webhook-events.ts — the
 * actual premium-grant/revoke logic. This is the core money-delivery path:
 * a silent bug here means a real mobile purchase charges the user and
 * grants premium nowhere in the app (the exact failure mode the route's
 * own top-of-file comment warns about), and it had never been tested end
 * to end before this suite.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  getAppUserByClerkId: vi.fn(),
}))

import { logAuditEvent } from '@/lib/audit'
import { handleRevenueCatEvent, type RevenueCatEvent } from '@/lib/revenuecat/webhook-events'
import { getAppUserByClerkId } from '@/lib/users/ensure-user'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  vi.mocked(logAuditEvent).mockResolvedValue(undefined as never)
})

function makeEvent(overrides: Partial<RevenueCatEvent> = {}): RevenueCatEvent {
  return {
    id: 'evt_1',
    type: 'INITIAL_PURCHASE',
    app_user_id: 'user_1',
    entitlement_ids: ['premium'],
    expiration_at_ms: 1893456000000,
    period_type: 'NORMAL',
    environment: 'PRODUCTION',
    product_id: 'premium_monthly',
    ...overrides,
  }
}

function lastUpdatePayload() {
  const builder = mockSupabase.from.mock.results.at(-1)?.value
  return builder?.update.mock.calls.at(-1)?.[0]
}

it('TEST events are a no-op — no user lookup, no write', async () => {
  await handleRevenueCatEvent(makeEvent({ type: 'TEST', app_user_id: 'no-such-id' }))

  expect(getAppUserByClerkId).not.toHaveBeenCalled()
})

it('an unknown app_user_id is logged and ignored, not thrown', async () => {
  vi.mocked(getAppUserByClerkId).mockResolvedValue(null)

  await expect(handleRevenueCatEvent(makeEvent())).resolves.toBeUndefined()
  expect(mockSupabase.from).not.toHaveBeenCalledWith('users')
})

describe('with a known user', () => {
  beforeEach(() => {
    vi.mocked(getAppUserByClerkId).mockResolvedValue(makeAppUser({ clerk_id: 'user_1' }))
    mockSupabase.push('users', { error: null })
  })

  it('INITIAL_PURCHASE with the premium entitlement grants active premium', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'INITIAL_PURCHASE' }))

    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBe('premium')
    expect(payload.subscription_status).toBe('active')
    expect(payload.subscription_provider).toBe('revenuecat')
  })

  it('INITIAL_PURCHASE with period_type TRIAL grants trialing status', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'INITIAL_PURCHASE', period_type: 'TRIAL' }))

    expect(lastUpdatePayload().subscription_status).toBe('trialing')
  })

  it('INITIAL_PURCHASE without the premium entitlement id grants nothing', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'INITIAL_PURCHASE', entitlement_ids: ['other'] }))

    expect(mockSupabase.from).not.toHaveBeenCalledWith('users')
  })

  it('EXPIRATION revokes premium — the real cutoff, unlike CANCELLATION', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'EXPIRATION' }))

    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBe('free')
    expect(payload.subscription_expires_at).toBeNull()
  })

  it('CANCELLATION does not change tier — entitlement stays active until expiration', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'CANCELLATION' }))

    expect(mockSupabase.from).not.toHaveBeenCalledWith('users')
    expect(logAuditEvent).toHaveBeenCalledWith(
      'user_1',
      'payment.subscription_cancelled',
      expect.objectContaining({ provider: 'revenuecat' })
    )
  })

  it('BILLING_ISSUE marks the subscription past_due', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'BILLING_ISSUE' }))

    expect(lastUpdatePayload().subscription_status).toBe('past_due')
  })

  it('RENEWAL refreshes expiry without touching tier', async () => {
    await handleRevenueCatEvent(makeEvent({ type: 'RENEWAL' }))

    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBeUndefined()
    expect(payload.subscription_status).toBe('active')
  })
})
