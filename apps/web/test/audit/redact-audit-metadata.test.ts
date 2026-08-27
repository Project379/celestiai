import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * audit_logs.user_id is ON DELETE SET NULL — rows outlive the account.
 * logAuditEvent must de-identify re-identification handles (Stripe object
 * ids, raw Clerk user ids) in the payload before insert, or a deleted
 * user's rows still resolve to a named person via Stripe / Clerk.
 *
 * Proven to fail against pre-redaction code: with redactValue removed,
 * the captured metadata holds `cus_…`/`sub_…`/`user_…` verbatim and every
 * assertion below fails.
 */

const insert = vi.fn().mockResolvedValue({ error: null })
vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: () => ({ from: () => ({ insert }) }),
}))

import { logAuditEvent } from '@/lib/audit'

beforeEach(() => {
  insert.mockClear()
})

function captured() {
  return insert.mock.calls[0][0].metadata as Record<string, unknown>
}

describe('logAuditEvent — payload de-identification', () => {
  it('redacts Stripe customer / subscription / invoice ids to prefix_…last4', async () => {
    await logAuditEvent('user_2abcdefghijklmnopqrstuvwx', 'payment.invoice_payment_failed', {
      stripeCustomerId: 'cus_QABC1234defGHIJ',
      stripeSubscriptionId: 'sub_1QABCdef2345',
      stripeInvoiceId: 'in_1QXYZ9876wvut',
      subscriptionStatus: 'past_due',
    })

    const m = captured()
    expect(m.stripeCustomerId).toBe('cus_…GHIJ')
    expect(m.stripeSubscriptionId).toBe('sub_…2345')
    expect(m.stripeInvoiceId).toBe('in_…wvut')
    // non-id fields untouched
    expect(m.subscriptionStatus).toBe('past_due')
  })

  it('redacts ids nested in objects and arrays (spread ...metadata paths)', async () => {
    await logAuditEvent(null, 'system.payment.webhook_ignored', {
      reason: 'stripe_customer_mismatch',
      detail: { eventStripeCustomerId: 'cus_ZZZ99988877766' },
      seen: ['cus_AAA11122233344', 'not-an-id'],
    })

    const m = captured() as { detail: { eventStripeCustomerId: string }; seen: string[] }
    expect(m.detail.eventStripeCustomerId).toBe('cus_…7766')
    expect(m.seen[0]).toBe('cus_…3344')
    expect(m.seen[1]).toBe('not-an-id')
  })

  it('redacts a raw Clerk user id carried in a system (user_id=null) payload', async () => {
    await logAuditEvent(null, 'system.payment.revenuecat_webhook_ignored', {
      appUserId: 'user_2abcDEFghiJKLmnoPQRstu',
      reason: 'unknown_app_user_id',
    })

    expect(captured().appUserId).toBe('user_…Rstu')
    expect(captured().reason).toBe('unknown_app_user_id')
  })

  it('leaves short/non-handle values alone', async () => {
    await logAuditEvent('user_2abcdefghijklmnopqrstuvwx', 'relationship.report_generated', {
      version: 3,
      relationshipType: 'romantic',
      productId: 'stellaeum_premium_monthly',
      eventId: 'evt_1QABCdef',
    })

    const m = captured()
    expect(m.version).toBe(3)
    expect(m.relationshipType).toBe('romantic')
    expect(m.productId).toBe('stellaeum_premium_monthly')
    // evt_ is a Stripe *event* id, not a person handle — prefix not in the denylist
    expect(m.eventId).toBe('evt_1QABCdef')
  })
})
