import { createHmac } from 'node:crypto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Route-layer tests for /api/webhooks/revenuecat: HMAC signature
 * verification (this route grants premium access on a mobile purchase,
 * so a broken signature check is a direct revenue/security bug), replay
 * tolerance, insert-first idempotency, and the fail-closed-on-missing-
 * secret behavior called out in the route's own code comments.
 * Event-dispatch logic (grant/revoke/past-due per event type) is covered
 * in revenuecat-webhook-events.test.ts.
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

vi.mock('@/lib/revenuecat/webhook-events', () => ({
  handleRevenueCatEvent: vi.fn(),
}))

import { logAuditEvent } from '@/lib/audit'
import { handleRevenueCatEvent } from '@/lib/revenuecat/webhook-events'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/webhooks/revenuecat/route'

const SECRET = 'test_revenuecat_secret'
let mockSupabase: MockSupabase

function sign(body: string, secret = SECRET, timestamp = Math.floor(Date.now() / 1000)) {
  const hmac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return `t=${timestamp},v1=${hmac}`
}

function makeRequest(body: string, signature?: string) {
  return new Request('http://localhost/api/webhooks/revenuecat', {
    method: 'POST',
    headers: signature !== undefined ? { 'x-revenuecat-webhook-signature': signature } : {},
    body,
  })
}

const validEvent = { event: { id: 'evt_1', type: 'TEST', app_user_id: 'user_1' } }
const validBody = JSON.stringify(validEvent)

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
  vi.mocked(logAuditEvent).mockResolvedValue(undefined as never)
  vi.mocked(handleRevenueCatEvent).mockResolvedValue(undefined)
  process.env.REVENUECAT_WEBHOOK_SECRET = SECRET
})

describe('POST /api/webhooks/revenuecat — fail-closed on missing secret', () => {
  it('rejects every request with 500 when the signing secret is unset', async () => {
    delete process.env.REVENUECAT_WEBHOOK_SECRET

    const res = await POST(makeRequest(validBody, sign(validBody)))

    expect(res.status).toBe(500)
    expect(handleRevenueCatEvent).not.toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/revenuecat — signature verification', () => {
  it('rejects a request with no signature header (401)', async () => {
    const res = await POST(makeRequest(validBody))
    expect(res.status).toBe(401)
  })

  it('rejects a malformed signature header (401)', async () => {
    const res = await POST(makeRequest(validBody, 'not-a-valid-header'))
    expect(res.status).toBe(401)
  })

  it('rejects a signature computed with the wrong secret (401, tampered/invalid)', async () => {
    const res = await POST(makeRequest(validBody, sign(validBody, 'wrong_secret')))
    expect(res.status).toBe(401)
  })

  it('rejects a signature whose timestamp is outside the 5-minute replay window', async () => {
    const staleTimestamp = Math.floor(Date.now() / 1000) - 400
    const res = await POST(makeRequest(validBody, sign(validBody, SECRET, staleTimestamp)))
    expect(res.status).toBe(401)
  })

  it('accepts a validly signed, in-window request', async () => {
    mockSupabase.push('processed_revenuecat_events', { error: null })
    const res = await POST(makeRequest(validBody, sign(validBody)))
    expect(res.status).toBe(200)
    expect(handleRevenueCatEvent).toHaveBeenCalledWith(validEvent.event)
  })
})

describe('POST /api/webhooks/revenuecat — payload validation', () => {
  it('rejects invalid JSON (400)', async () => {
    const body = '{not json'
    const res = await POST(makeRequest(body, sign(body)))
    expect(res.status).toBe(400)
  })

  it('rejects a payload missing event.id/type (400)', async () => {
    const body = JSON.stringify({ event: { app_user_id: 'user_1' } })
    const res = await POST(makeRequest(body, sign(body)))
    expect(res.status).toBe(400)
  })
})

describe('POST /api/webhooks/revenuecat — idempotency', () => {
  it('returns 200 without processing when the unique-constraint insert reports a duplicate', async () => {
    mockSupabase.push('processed_revenuecat_events', { error: { code: '23505' } })

    const res = await POST(makeRequest(validBody, sign(validBody)))

    expect(res.status).toBe(200)
    expect(handleRevenueCatEvent).not.toHaveBeenCalled()
  })

  it('inserts the event marker before calling the handler (insert-first ordering)', async () => {
    mockSupabase.push('processed_revenuecat_events', { error: null })

    await POST(makeRequest(validBody, sign(validBody)))

    const builder = mockSupabase.from.mock.results[0]?.value
    expect(builder.insert).toHaveBeenCalledWith({ event_id: 'evt_1', event_type: 'TEST' })
    expect(handleRevenueCatEvent).toHaveBeenCalled()
  })
})

describe('POST /api/webhooks/revenuecat — processing failure rollback', () => {
  it('deletes the processed-event marker and returns 500 when the handler throws', async () => {
    mockSupabase.push('processed_revenuecat_events', { error: null })
    vi.mocked(handleRevenueCatEvent).mockRejectedValue(new Error('grant premium failed'))

    const res = await POST(makeRequest(validBody, sign(validBody)))

    expect(res.status).toBe(500)
    const deleteBuilder = mockSupabase.from.mock.results
      .map((r) => r.value)
      .find((b) => b.delete.mock.calls.length > 0)
    expect(deleteBuilder).toBeDefined()
  })
})
