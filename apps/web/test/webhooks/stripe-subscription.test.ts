import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Logic-layer tests for apps/web/lib/stripe/subscription.ts — the actual
 * tier-write and ownership-guard behavior invoked by the webhook route.
 * This is the highest-risk file in the Stripe path: a silent regression
 * here means paying users don't get premium, or a spoofed event does.
 */

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    subscriptions: { retrieve: vi.fn(), update: vi.fn() },
  },
}))

import { logAuditEvent } from '@/lib/audit'
import { stripe } from '@/lib/stripe/client'
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  StripeWebhookIgnoredError,
} from '@/lib/stripe/subscription'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  vi.mocked(logAuditEvent).mockResolvedValue(undefined as never)
})

function lastUpdatePayload() {
  const builder = mockSupabase.from.mock.results.at(-1)?.value
  return builder?.update.mock.calls.at(-1)?.[0]
}

describe('handleCheckoutComplete', () => {
  it('throws StripeWebhookIgnoredError when session metadata has no clerkUserId', async () => {
    const session = { metadata: {}, subscription: 'sub_1', customer: 'cus_1' } as never

    await expect(handleCheckoutComplete(session)).rejects.toThrow(StripeWebhookIgnoredError)
  })

  it('grants trialing premium and cancels-at-period-end for a trial checkout', async () => {
    const session = {
      id: 'cs_1',
      mode: 'subscription',
      metadata: { clerkUserId: 'user_1', checkoutType: 'trial' },
      subscription: 'sub_1',
      customer: 'cus_1',
    } as never
    const subscription = {
      id: 'sub_1',
      status: 'trialing',
      customer: 'cus_1',
      cancel_at_period_end: false,
      metadata: {},
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(makeAppUser({ clerk_id: 'user_1' }))
    mockSupabase.push('users', { error: null })

    await handleCheckoutComplete(session)

    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', {
      cancel_at_period_end: true,
    })
    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBe('premium')
    expect(payload.subscription_status).toBe('trialing')
  })

  it('links the subscription without granting a tier on a non-trial checkout', async () => {
    const session = {
      id: 'cs_2',
      mode: 'subscription',
      metadata: { clerkUserId: 'user_1' },
      subscription: 'sub_2',
      customer: 'cus_1',
    } as never
    const subscription = {
      id: 'sub_2',
      status: 'active',
      customer: 'cus_1',
      cancel_at_period_end: false,
      metadata: {},
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(makeAppUser({ clerk_id: 'user_1' }))
    mockSupabase.push('users', { error: null })

    await handleCheckoutComplete(session)

    expect(stripe.subscriptions.update).not.toHaveBeenCalled()
    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBeUndefined()
    expect(payload.stripe_subscription_id).toBe('sub_2')
  })

  it('ignores the event when the Stripe customer id does not match the stored one', async () => {
    const session = {
      id: 'cs_3',
      mode: 'subscription',
      metadata: { clerkUserId: 'user_1' },
      subscription: 'sub_3',
      customer: 'cus_new',
    } as never
    const subscription = {
      id: 'sub_3',
      status: 'active',
      customer: 'cus_new',
      metadata: {},
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({ clerk_id: 'user_1', stripe_customer_id: 'cus_old' })
    )

    await expect(handleCheckoutComplete(session)).rejects.toThrow(StripeWebhookIgnoredError)
  })
})

describe('handleSubscriptionUpdated', () => {
  it('revokes premium when the subscription status is canceled', async () => {
    const sub = {
      id: 'sub_1',
      status: 'canceled',
      customer: 'cus_1',
      metadata: { clerkUserId: 'user_1' },
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({ clerk_id: 'user_1', subscription_tier: 'premium', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
    )
    mockSupabase.push('users', { error: null })

    await handleSubscriptionUpdated(sub)

    expect(lastUpdatePayload().subscription_tier).toBe('free')
  })

  it('preserves the existing tier for a non-terminal status update', async () => {
    const sub = {
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      metadata: { clerkUserId: 'user_1' },
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({ clerk_id: 'user_1', subscription_tier: 'premium', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
    )
    mockSupabase.push('users', { error: null })

    await handleSubscriptionUpdated(sub)

    expect(lastUpdatePayload().subscription_tier).toBe('premium')
  })
})

describe('handleSubscriptionDeleted', () => {
  it('revokes premium and clears the stored subscription id', async () => {
    const sub = {
      id: 'sub_1',
      customer: 'cus_1',
      metadata: { clerkUserId: 'user_1' },
    } as never
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({ clerk_id: 'user_1', subscription_tier: 'premium', stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1' })
    )
    mockSupabase.push('users', { error: null })

    await handleSubscriptionDeleted(sub)

    const payload = lastUpdatePayload()
    expect(payload.subscription_tier).toBe('free')
    expect(payload.stripe_subscription_id).toBeNull()
  })
})

describe('handleInvoicePaid', () => {
  it('does nothing when the invoice has no linked subscription', async () => {
    const invoice = { parent: null } as never

    await handleInvoicePaid(invoice)

    expect(ensureUserRecord).not.toHaveBeenCalled()
  })

  it('grants premium and refreshes expiry on a paid renewal invoice', async () => {
    const invoice = {
      parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } },
    } as never
    const subscription = {
      id: 'sub_1',
      status: 'active',
      customer: 'cus_1',
      metadata: { clerkUserId: 'user_1' },
      items: { data: [{ current_period_end: 1893456000 }] },
    } as never
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(makeAppUser({ clerk_id: 'user_1' }))
    mockSupabase.push('users', { error: null })

    await handleInvoicePaid(invoice)

    expect(lastUpdatePayload().subscription_tier).toBe('premium')
  })
})

describe('handleInvoicePaymentFailed', () => {
  const subscription = {
    id: 'sub_1',
    status: 'past_due',
    customer: 'cus_1',
    metadata: { clerkUserId: 'user_1' },
    items: { data: [{ current_period_end: 1893456000 }] },
  } as never
  const invoice = {
    id: 'in_1',
    parent: { type: 'subscription_details', subscription_details: { subscription: 'sub_1' } },
  } as never

  it('marks past_due when the user is premium, stripe-provided, and past expiry', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({
        clerk_id: 'user_1',
        subscription_tier: 'premium',
        subscription_provider: 'stripe',
        subscription_expires_at: '2020-01-01T00:00:00.000Z',
      })
    )
    mockSupabase.push('users', { error: null })

    await handleInvoicePaymentFailed(invoice)

    expect(lastUpdatePayload().subscription_status).toBe('past_due')
  })

  it('leaves local state unchanged when the row is currently owned by RevenueCat', async () => {
    vi.mocked(stripe.subscriptions.retrieve).mockResolvedValue(subscription)
    vi.mocked(ensureUserRecord).mockResolvedValue(
      makeAppUser({
        clerk_id: 'user_1',
        subscription_tier: 'premium',
        subscription_provider: 'revenuecat',
        subscription_expires_at: '2020-01-01T00:00:00.000Z',
      })
    )

    await handleInvoicePaymentFailed(invoice)

    // 'users' table should never have been touched — only the audit log fires.
    const userWrites = mockSupabase.from.mock.calls.filter((c) => c[0] === 'users')
    expect(userWrites).toHaveLength(0)
  })
})
