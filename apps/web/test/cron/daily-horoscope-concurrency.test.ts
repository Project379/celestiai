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
 *
 * 2026-08-28: response shape changed from top-level { sent, failed,
 * mobile } to { web: { sent, failed, expired, error? }, mobile }. The web
 * block was extracted into sendWebPush() with its own try/catch so a
 * malformed VAPID key (Sentry, release f3e2feb) — or any web-transport
 * failure — degrades only web push and the mobile Expo push still runs.
 * "a failing VAPID config degrades web push only" covers that isolation
 * and was confirmed to FAIL against the pre-extraction route
 * (setVapidDetails threw straight out of the handler, mobile never ran).
 *
 * 2026-08-28 (same day): expired-subscription sweep extended past 404/410
 * to the VAPID-rotation case. A 401/403 per endpoint means the push
 * service rejected our VAPID JWT for that subscription — a stale
 * application-server-key binding, which the old code counted as `failed`
 * forever and never cleaned up. It is now swept, BUT only behind a
 * sibling-success guard: if zero sends succeeded this run, the keypair
 * itself is the suspect and deleting anything would wipe live rows to
 * mask a config error — so nothing is deleted and it pages. The
 * "batch-wide 401/403 ... deletes NOTHING" test is the dangerous
 * direction; it was confirmed to FAIL against a build with the guard
 * removed (naive `statusCode === 403 → delete` wipes every subscription).
 */

vi.mock('@/lib/auth/cron-secret', () => ({
  verifyCronSecret: vi.fn(() => true),
}))

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}))

const sendNotification = vi.hoisted(() =>
  vi.fn(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  }),
)

const setVapidDetails = vi.hoisted(() => vi.fn())

vi.mock('web-push', () => ({
  default: {
    setVapidDetails,
    sendNotification,
  },
}))

const sendPushNotificationsAsync = vi.hoisted(() =>
  vi.fn(async (_chunk: unknown): Promise<unknown[]> => []),
)

vi.mock('expo-server-sdk', () => ({
  Expo: class {
    static isExpoPushToken() {
      return true
    }
    chunkPushNotifications(messages: unknown[]) {
      return [messages]
    }
    chunkPushNotificationReceiptIds(ids: unknown[]) {
      return [ids]
    }
    async sendPushNotificationsAsync(chunk: unknown) {
      return sendPushNotificationsAsync(chunk)
    }
    async getPushNotificationReceiptsAsync() {
      return {}
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

/**
 * Fake supabase-js chain. `deletedEndpoints` accumulates every value
 * passed to `.in('endpoint', […])` on a `push_subscriptions` builder that
 * had `.delete()` called on it — so a test can assert exactly which
 * endpoints (if any) were swept.
 */
function makeFakeSupabase(
  subscriptions: ReturnType<typeof makeSubscriptions>,
  tokenRows: { token: string }[] = [],
) {
  const deletedEndpoints: string[] = []

  const from = vi.fn((table: string) => {
    if (table === 'push_subscriptions') {
      const builder: Record<string, unknown> = {}
      let deleteMode = false
      builder.select = vi.fn(() => builder)
      builder.limit = vi.fn(() => builder)
      builder.delete = vi.fn(() => {
        deleteMode = true
        return builder
      })
      builder.in = vi.fn((_col: string, vals: unknown) => {
        if (deleteMode && Array.isArray(vals)) deletedEndpoints.push(...vals)
        return builder
      })
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: subscriptions, error: null }).then(onFulfilled)
      return builder
    }
    if (table === 'push_tokens') {
      const builder: Record<string, unknown> = {}
      const methods = ['select', 'limit', 'is', 'delete', 'in', 'update']
      for (const m of methods) builder[m] = vi.fn(() => builder)
      builder.then = (onFulfilled: (v: unknown) => unknown) =>
        Promise.resolve({ data: tokenRows, error: null }).then(onFulfilled)
      return builder
    }
    const builder: Record<string, unknown> = {}
    const methods = ['select', 'limit', 'is', 'delete', 'in']
    for (const m of methods) builder[m] = vi.fn(() => builder)
    builder.then = (onFulfilled: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null }).then(onFulfilled)
    return builder
  })
  return { from, deletedEndpoints }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/cron/daily-horoscope/route'

beforeEach(() => {
  vi.clearAllMocks()
  setVapidDetails.mockImplementation(() => {})
  sendNotification.mockImplementation(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50))
  })
  sendPushNotificationsAsync.mockImplementation(async () => [])
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

    expect(body.web.sent).toBe(50)
    expect(body.web.failed).toBe(0)
    // Pre-fix (sequential): 50 * 50ms = ~2500ms minimum. Post-fix (2
    // batches of 25 concurrent): ~2 * 50ms = ~100ms, generously bounded
    // here at 800ms to absorb test-runner scheduling jitter without
    // being so loose it'd pass against the sequential implementation too.
    expect(elapsed).toBeLessThan(800)
  })

  it('still tracks per-subscriber failures and 410-expired cleanup correctly under concurrency', async () => {
    const subscriptions = makeSubscriptions(3)
    sendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('Gone'), { statusCode: 410 }))
      .mockRejectedValueOnce(new Error('transient failure'))

    const fake = makeFakeSupabase(subscriptions)
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)

    const res = await GET(req())
    const body = await res.json()

    expect(body.web.sent).toBe(1)
    expect(body.web.failed).toBe(2)
    expect(body.web.expired).toBe(1)
    // Only the 410 endpoint is swept; the transient failure is left alone.
    expect(fake.deletedEndpoints).toEqual([subscriptions[1].endpoint])
    expect(body.web.error).toBeUndefined()
  })

  it('a failing VAPID config degrades web push only — the mobile Expo push still runs', async () => {
    // Reproduces the Sentry error on release f3e2feb: setVapidDetails
    // rejects a malformed VAPID_PRIVATE_KEY. Pre-extraction this threw
    // straight out of the handler and sendMobilePush never executed.
    setVapidDetails.mockImplementation(() => {
      throw new Error('Vapid private key should be 32 bytes long when decoded.')
    })

    const fake = makeFakeSupabase(makeSubscriptions(5), [{ token: 'ExponentPushToken[x]' }])
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)

    const res = await GET(req())
    const body = await res.json()

    // Web transport reports its failure without throwing…
    expect(res.status).toBe(200)
    expect(body.web.error).toMatch(/32 bytes/)
    expect(body.web.sent).toBe(0)
    expect(sendNotification).not.toHaveBeenCalled()

    // …and the mobile transport still ran.
    expect(sendPushNotificationsAsync).toHaveBeenCalled()
    expect(body.mobile).toBeDefined()
  })

  it('a single 401/403 alongside successful sends is a stale key binding — that one endpoint is swept', async () => {
    const subscriptions = makeSubscriptions(3)
    sendNotification
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(Object.assign(new Error('Forbidden'), { statusCode: 403 }))
      .mockResolvedValueOnce(undefined)

    const fake = makeFakeSupabase(subscriptions)
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)

    const res = await GET(req())
    const body = await res.json()

    expect(body.web.sent).toBe(2)
    expect(body.web.failed).toBe(1)
    expect(body.web.expired).toBe(1)
    expect(fake.deletedEndpoints).toEqual([subscriptions[1].endpoint])
    expect(body.web.error).toBeUndefined()
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled()
  })

  it('batch-wide 401/403 with ZERO successful sends deletes NOTHING and pages (sibling-success guard)', async () => {
    // The dangerous direction. A naive `statusCode === 403 → delete` rule
    // wipes the entire push_subscriptions table the next time a VAPID key
    // is misconfigured — a failure mode we just lived through. Confirmed
    // to FAIL (deletedEndpoints non-empty, no Sentry call) against a build
    // with the guard removed before restoring it.
    const subscriptions = makeSubscriptions(4)
    sendNotification.mockRejectedValue(
      Object.assign(new Error('Forbidden'), { statusCode: 403 }),
    )

    const fake = makeFakeSupabase(subscriptions)
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)

    const res = await GET(req())
    const body = await res.json()

    expect(body.web.sent).toBe(0)
    expect(body.web.failed).toBe(4)
    expect(body.web.expired).toBe(0)
    expect(fake.deletedEndpoints).toEqual([]) // nothing swept
    expect(body.web.error).toBe('vapid-keypair-suspected-misconfig')
    expect(vi.mocked(Sentry.captureException)).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          reason: 'vapid-keypair-suspected-misconfig',
        }),
      }),
    )
  })
})
