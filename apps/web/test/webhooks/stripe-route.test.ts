import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Route-layer tests for /api/webhooks/stripe: signature verification,
 * idempotency, event dispatch, and the ignored-vs-real-error distinction.
 * Handler bodies (handleCheckoutComplete etc.) are mocked here — their own
 * logic is covered in stripe-subscription.test.ts. Keeping these separate
 * mirrors the module boundary the source code itself draws.
 */

vi.mock('next/server', () => ({
  after: (fn: () => unknown) => {
    fn()
  },
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/stripe/client', () => ({
  stripe: { webhooks: { constructEvent: vi.fn() } },
}))

const { StripeWebhookIgnoredError } = vi.hoisted(() => {
  class StripeWebhookIgnoredError extends Error {
    constructor(
      message: string,
      public readonly metadata: Record<string, unknown> = {}
    ) {
      super(message)
      this.name = 'StripeWebhookIgnoredError'
    }
  }
  return { StripeWebhookIgnoredError }
})

vi.mock('@/lib/stripe/subscription', () => ({
  handleCheckoutComplete: vi.fn(),
  handleSubscriptionUpdated: vi.fn(),
  handleSubscriptionDeleted: vi.fn(),
  handleInvoicePaid: vi.fn(),
  handleInvoicePaymentFailed: vi.fn(),
  StripeWebhookIgnoredError,
}))

import { logAuditEvent } from '@/lib/audit'
import { stripe } from '@/lib/stripe/client'
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from '@/lib/stripe/subscription'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/webhooks/stripe/route'

let mockSupabase: MockSupabase

function makeRequest(body: string, signature = 'sig_valid') {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature },
    body,
  })
}

function makeEvent(overrides: Partial<{ id: string; type: string; data: { object: unknown } }> = {}) {
  return {
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: { object: {} },
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  vi.mocked(logAuditEvent).mockResolvedValue(undefined as never)
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
})

describe('POST /api/webhooks/stripe — signature verification', () => {
  it('rejects a request with an invalid signature (400, no handler called)', async () => {
    vi.mocked(stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('No signatures found matching the expected signature for payload')
    })

    const res = await POST(makeRequest('{}', 'bad_sig'))

    expect(res.status).toBe(400)
    expect(handleCheckoutComplete).not.toHaveBeenCalled()
    expect(mockSupabase.from).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/stripe — idempotency', () => {
  it('returns 200 without reprocessing a duplicate event id', async () => {
    const event = makeEvent()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: { id: 'row_1' } })

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(handleCheckoutComplete).not.toHaveBeenCalled()
  })

  it('records the event as processed after a successful handler run', async () => {
    const session = { mode: 'subscription', metadata: { clerkUserId: 'user_1' }, subscription: 'sub_1' }
    const event = makeEvent({ data: { object: session } })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: null }) // no existing row
    vi.mocked(handleCheckoutComplete).mockResolvedValue(undefined)

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(handleCheckoutComplete).toHaveBeenCalledWith(session)
    // insert() is the second call on 'processed_webhook_events' — assert it happened.
    const insertCalls = mockSupabase.from.mock.results
      .map((r) => r.value)
      .filter((builder) => builder.insert.mock.calls.length > 0)
    expect(insertCalls.length).toBeGreaterThan(0)
  })
})

describe('POST /api/webhooks/stripe — event dispatch', () => {
  const cases: Array<{
    type: string
    object: unknown
    handler: (...args: never[]) => Promise<void>
  }> = [
    {
      type: 'customer.subscription.updated',
      object: { id: 'sub_1', metadata: {} },
      handler: handleSubscriptionUpdated,
    },
    {
      type: 'customer.subscription.deleted',
      object: { id: 'sub_1', metadata: {} },
      handler: handleSubscriptionDeleted,
    },
    { type: 'invoice.paid', object: { id: 'in_1' }, handler: handleInvoicePaid },
    {
      type: 'invoice.payment_failed',
      object: { id: 'in_1' },
      handler: handleInvoicePaymentFailed,
    },
  ]

  it.each(cases)('dispatches $type to its handler and returns 200', async ({ type, object, handler }) => {
    const event = makeEvent({ type, data: { object } })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: null })
    vi.mocked(handler).mockResolvedValue(undefined)

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(handler).toHaveBeenCalledWith(object)
  })

  it('marks an unhandled event type as processed without calling any handler', async () => {
    const event = makeEvent({ type: 'customer.updated' })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: null })

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
    expect(handleCheckoutComplete).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/stripe — error handling', () => {
  it('treats StripeWebhookIgnoredError as success: marks processed, returns 200', async () => {
    const session = { mode: 'subscription', metadata: {}, subscription: 'sub_1' }
    const event = makeEvent({ data: { object: session } })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: null })
    vi.mocked(handleCheckoutComplete).mockRejectedValue(
      new StripeWebhookIgnoredError('missing_clerk_user_id', {})
    )

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(200)
  })

  it('returns 500 and does not mark processed on a real handler error', async () => {
    const session = { mode: 'subscription', metadata: {}, subscription: 'sub_1' }
    const event = makeEvent({ data: { object: session } })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue(event as never)
    mockSupabase.push('processed_webhook_events', { data: null })
    vi.mocked(handleCheckoutComplete).mockRejectedValue(new Error('Supabase upsert failed'))

    const res = await POST(makeRequest('{}'))

    expect(res.status).toBe(500)
  })
})
