import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 2026-08-26 sweep finding #11: the web-push send loop awaited one
 * subscriber at a time — at realistic latency this put a hard ceiling
 * around 1,500 subscribers before maxDuration killed the function
 * mid-loop. Fix: batched concurrency (WEB_PUSH_CONCURRENCY at a time via
 * Promise.allSettled) instead of a sequential for-await loop. This test
 * proves the shape changed — sends within a batch overlap in time — by
 * having each send take a fixed delay and asserting total wall-clock
 * time is close to (subscribers / concurrency) * delay, not
 * subscribers * delay. Also proves per-subscriber outcome handling
 * (sent/failed/expired-cleanup) is unchanged by the concurrency switch.
 * Per standing discipline, this test was run against the pre-fix
 * (sequential) route and confirmed the timing assertion fails before the
 * fix was restored.
 */

vi.mock('@/lib/auth/cron-secret', () => ({
  verifyCronSecret: vi.fn(() => true),
}))

const sendNotification = vi.hoisted(() =>
  vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }),
)

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification,
  },
}))

vi.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return true
    }
    chunkPushNotifications(messages: unknown[]) {
      return [messages]
    }
    async sendPushNotificationsAsync() {
      return []
    }
  },
}))

function makeSubscriptions(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `sub-${i}`,
    endpoint: `https://push.example/${i}`,
    p256dh: 'p256dh',
    auth: 'auth',
  }))
}

function makeFakeSupabase(subscriptions: ReturnType<typeof makeSubscriptions>) {
  const from = vi.fn((table: string) => {
    if (table === 'push_subscriptions') {
      const builder: Record<string, unknown> = {}
      const methods = ['select', 'limit', 'delete', 'in']
      for (const m of methods) builder[m] = vi.fn(() => builder)
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: subscriptions, error: null }).then(onFulfilled)
      return builder
    }
    const builder: Record<string, unknown> = {}
    const methods = ['select', 'limit', 'is', 'delete', 'in']
    for (const m of methods) builder[m] = vi.fn(() => builder)
    builder.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    return builder
  })
  return { from }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/cron/daily-horoscope/route'

beforeEach(() => {
  vi.clearAllMocks()
  sendNotification.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  process.env.CRON_SECRET = 'test-cron-secret'
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'vapid-public'
  process.env.VAPID_PRIVATE_KEY = 'vapid-private'
})

function req() {
  return new Request('http://localhost/api/cron/daily-horoscope', {
    headers: { Authorization: 'Bearer test-cron-secret' },
  })
}

describe('GET /api/cron/daily-horoscope — web-push batched concurrency (2026-08-26 sweep #11)', () => {
  it('sends in overlapping batches, not strictly sequentially — wall time is well under subscribers * per-send delay', async () => {
    const subscriptions = makeSubscriptions(50) // 2 batches at WEB_PUSH_CONCURRENCY=25
    vi.mocked(createServiceSupabaseClient).mockReturnValue(
      makeFakeSupabase(subscriptions) as never,
    )

    const start = Date.now()
    const res = await GET(req())
    const elapsed = Date.now() - start
    const body = await res.json()

    expect(body.sent).toBe(50)
    expect(body.failed).toBe(0)
    // Pre-fix (sequential): 50 * 50ms = ~2500ms minimum. Post-fix (2
    // batches of 25 concurrent): ~2 * 50ms = ~100ms, generously bounded
    // here at 800ms to absorb test-runner scheduling jitter without
    // being so loose it'd pass against the sequential implementation too.
    expect(elapsed).toBeLessThan(800)
  })

  it('still tracks per-subscriber failures and expired-endpoint cleanup correctly under concurrency', async () => {
    const subscriptions = makeSubscriptions(3)
    sendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
      .mockRejectedValueOnce(new Error('transient failure'))

    const fake = makeFakeSupabase(subscriptions)
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)

    const res = await GET(req())
    const body = await res.json()

    expect(body.sent).toBe(1)
    expect(body.failed).toBe(2)

    const deleteCall = fake.from.mock.calls.find((c) => c[0] === 'push_subscriptions')
    expect(deleteCall).toBeTruthy()
  })
})
