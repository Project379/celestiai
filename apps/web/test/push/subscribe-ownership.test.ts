import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Batch 5.5 finding #19: POST /api/push/subscribe's upsert
 * (onConflict:'endpoint') had no ownership guard — re-POSTing an
 * endpoint that already belongs to a DIFFERENT user's row would
 * silently reassign it to the caller, displacing the original owner.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_attacker' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/push/subscribe/route'

let mockSupabase: MockSupabase

function makeRequest(endpoint: string) {
  return new Request('http://localhost/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      subscription: { endpoint, keys: { p256dh: 'a', auth: 'b' } },
    }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/push/subscribe — ownership guard (Batch 5.5 #19)', () => {
  it('rejects with 409 when the endpoint already belongs to a different user', async () => {
    mockSupabase.push('push_subscriptions', { data: { user_id: 'user_victim' } })

    const res = await POST(makeRequest('https://push.example/victim-endpoint'))

    // Pre-fix: this upserted unconditionally, silently reassigning the
    // victim's subscription to the attacker's user_id.
    expect(res.status).toBe(409)

    // The upsert must never have been reached — only the ownership-check
    // SELECT (queued above) was consumed from the FIFO queue.
    expect(mockSupabase.from).toHaveBeenCalledTimes(1)
  })

  it('allows the upsert when the endpoint has no existing owner', async () => {
    mockSupabase.push('push_subscriptions', { data: null })
    mockSupabase.push('push_subscriptions', { data: null })

    const res = await POST(makeRequest('https://push.example/new-endpoint'))

    expect(res.status).toBe(200)
    expect(mockSupabase.from).toHaveBeenCalledTimes(2)
  })

  it('allows the upsert when the caller re-subscribes their own existing endpoint', async () => {
    mockSupabase.push('push_subscriptions', { data: { user_id: 'user_attacker' } })
    mockSupabase.push('push_subscriptions', { data: null })

    const res = await POST(makeRequest('https://push.example/own-endpoint'))

    expect(res.status).toBe(200)
  })
})
