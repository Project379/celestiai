import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Batch 1 added `assertRateLimit` to 17 routes with no verification beyond a
 * typecheck. The real risk isn't "does the limiter work" (covered in
 * rate-limit.test.ts) — it's "does every route actually surface the 429 the
 * limiter throws, or does one of them swallow it into a generic 500 because
 * the `instanceof ApiError` check was missed or misplaced." This test
 * forces `assertRateLimit` to throw a real 429 ApiError for every route and
 * asserts the route returns 429 with the limiter's own message — not that
 * it merely doesn't crash. A route that returns 500 here is a real Batch 1
 * bug, not a test problem.
 *
 * `assertRateLimit` is mocked at the module boundary (not by driving the
 * real Supabase RPC through many limit-exceeded calls) — this isolates
 * "does the route handle the limiter's own contract correctly" from "does
 * the limiter itself work" (that's rate-limit.test.ts's job). Each route's
 * OTHER dependencies are also mocked, but since `assertRateLimit` throws as
 * the very first meaningful action in every one of these routes (verified
 * by reading each file during Batch 1), none of those other mocks should
 * ever actually be invoked — asserted explicitly per route below, which is
 * itself a real check: if a route calls something before the rate limit in
 * practice, that's a burst-guard-placement bug worth catching.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test123' })),
}))

const RATE_LIMIT_ERROR_MESSAGE = 'Too many requests'

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {
    const { ApiError } = await import('@/lib/auth/guards')
    throw new ApiError(429, RATE_LIMIT_ERROR_MESSAGE, 'RATE_LIMITED')
  }),
  getRequestIp: vi.fn(() => 'unknown'),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(() => {
    throw new Error('createServiceSupabaseClient should not be called — assertRateLimit should throw first')
  }),
}))

vi.mock('@/lib/stripe/client', () => ({
  stripe: new Proxy(
    {},
    {
      get() {
        throw new Error('stripe client should not be touched — assertRateLimit should throw first')
      },
    },
  ),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(() => {
    throw new Error('logAuditEvent should not be called — assertRateLimit should throw first')
  }),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(() => {
    throw new Error('ensureUserRecord should not be called — assertRateLimit should throw first')
  }),
  isDeletionPending: vi.fn(() => false),
}))

vi.mock('@stellaeum/core/charts/birth-data', () => ({
  listBirthCharts: vi.fn(() => {
    throw new Error('listBirthCharts should not be called')
  }),
  createBirthChart: vi.fn(() => {
    throw new Error('createBirthChart should not be called')
  }),
  getBirthChart: vi.fn(() => {
    throw new Error('getBirthChart should not be called')
  }),
  updateBirthChart: vi.fn(() => {
    throw new Error('updateBirthChart should not be called')
  }),
  deleteBirthChart: vi.fn(() => {
    throw new Error('deleteBirthChart should not be called')
  }),
}))

vi.mock('@stellaeum/core/charts/calculate', () => ({
  calculateChartForUser: vi.fn(() => {
    throw new Error('calculateChartForUser should not be called')
  }),
}))

vi.mock('@stellaeum/core/diary/entries', () => ({
  getDiaryEntry: vi.fn(() => {
    throw new Error('getDiaryEntry should not be called')
  }),
  updateDiaryEntry: vi.fn(() => {
    throw new Error('updateDiaryEntry should not be called')
  }),
  deleteDiaryEntry: vi.fn(() => {
    throw new Error('deleteDiaryEntry should not be called')
  }),
}))

vi.mock('@/lib/circle/service', () => ({
  getUserTier: vi.fn(() => {
    throw new Error('getUserTier should not be called')
  }),
  listSavedProfilesForUser: vi.fn(() => {
    throw new Error('listSavedProfilesForUser should not be called')
  }),
  getSavedProfileForUser: vi.fn(() => {
    throw new Error('getSavedProfileForUser should not be called')
  }),
  getLatestChartRowForUser: vi.fn(() => {
    throw new Error('getLatestChartRowForUser should not be called')
  }),
  getSpaceById: vi.fn(() => {
    throw new Error('getSpaceById should not be called')
  }),
  hasActiveRomanticSpace: vi.fn(() => {
    throw new Error('hasActiveRomanticSpace should not be called')
  }),
  listSpaceMembers: vi.fn(() => {
    throw new Error('listSpaceMembers should not be called')
  }),
  getConnectionInviteByTokenHash: vi.fn(() => {
    throw new Error('getConnectionInviteByTokenHash should not be called')
  }),
  getChartById: vi.fn(() => {
    throw new Error('getChartById should not be called')
  }),
  buildSpaceComputation: vi.fn(() => {
    throw new Error('buildSpaceComputation should not be called')
  }),
}))

vi.mock('@/lib/circle/token', () => ({
  createInviteToken: vi.fn(() => {
    throw new Error('createInviteToken should not be called')
  }),
  hashInviteToken: vi.fn(() => {
    throw new Error('hashInviteToken should not be called')
  }),
}))

vi.mock('@/lib/circle/report', () => ({
  buildCompatibilityReportContent: vi.fn(() => {
    throw new Error('buildCompatibilityReportContent should not be called')
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

function req(url: string, init?: RequestInit) {
  return new Request(url, init)
}

function jsonReq(url: string, body: unknown, method = 'POST') {
  return new Request(url, { method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } })
}

async function expectRateLimited(responsePromise: Promise<Response>) {
  const res = await responsePromise
  expect(res.status).toBe(429)
  const body = await res.json()
  expect(body.error).toBe(RATE_LIMIT_ERROR_MESSAGE)
}

describe('rate-limited routes surface 429, not 500, when assertRateLimit throws', () => {
  it('GET /api/birth-data', async () => {
    const { GET } = await import('@/app/api/birth-data/route')
    await expectRateLimited(GET())
  })

  it('POST /api/birth-data', async () => {
    const { POST } = await import('@/app/api/birth-data/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/birth-data', {})))
  })

  it('GET /api/birth-data/[id]', async () => {
    const { GET } = await import('@/app/api/birth-data/[id]/route')
    await expectRateLimited(
      GET(req('http://localhost/api/birth-data/abc'), { params: Promise.resolve({ id: 'abc' }) }),
    )
  })

  it('PATCH /api/birth-data/[id]', async () => {
    const { PATCH } = await import('@/app/api/birth-data/[id]/route')
    await expectRateLimited(
      PATCH(jsonReq('http://localhost/api/birth-data/abc', {}, 'PATCH'), {
        params: Promise.resolve({ id: 'abc' }),
      }),
    )
  })

  it('DELETE /api/birth-data/[id]', async () => {
    const { DELETE } = await import('@/app/api/birth-data/[id]/route')
    await expectRateLimited(
      DELETE(req('http://localhost/api/birth-data/abc', { method: 'DELETE' }), {
        params: Promise.resolve({ id: 'abc' }),
      }),
    )
  })

  it('POST /api/chart/calculate', async () => {
    const { POST } = await import('@/app/api/chart/calculate/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/chart/calculate', { chartId: 'c1' })))
  })

  it('GET /api/oracle/readings', async () => {
    const { GET } = await import('@/app/api/oracle/readings/route')
    await expectRateLimited(GET(req('http://localhost/api/oracle/readings?chartId=c1')))
  })

  it('GET /api/diary/entries/[id] (Batch 5.5 #7)', async () => {
    const { GET } = await import('@/app/api/diary/entries/[id]/route')
    await expectRateLimited(
      GET(req('http://localhost/api/diary/entries/abc'), { params: Promise.resolve({ id: 'abc' }) }),
    )
  })

  it('PATCH /api/diary/entries/[id] (Batch 5.5 #7)', async () => {
    const { PATCH } = await import('@/app/api/diary/entries/[id]/route')
    await expectRateLimited(
      PATCH(jsonReq('http://localhost/api/diary/entries/abc', {}, 'PATCH'), {
        params: Promise.resolve({ id: 'abc' }),
      }),
    )
  })

  it('DELETE /api/diary/entries/[id] (Batch 5.5 #7)', async () => {
    const { DELETE } = await import('@/app/api/diary/entries/[id]/route')
    await expectRateLimited(
      DELETE(req('http://localhost/api/diary/entries/abc', { method: 'DELETE' }), {
        params: Promise.resolve({ id: 'abc' }),
      }),
    )
  })

  it('POST /api/push/register (Batch 5.5 #20)', async () => {
    const { POST } = await import('@/app/api/push/register/route')
    await expectRateLimited(
      POST(jsonReq('http://localhost/api/push/register', { token: 't', platform: 'ios', deviceId: 'd1' })),
    )
  })

  it('POST /api/push/subscribe (Batch 5.5 #20)', async () => {
    const { POST } = await import('@/app/api/push/subscribe/route')
    await expectRateLimited(
      POST(
        jsonReq('http://localhost/api/push/subscribe', {
          subscription: { endpoint: 'https://push.example/e1', keys: { p256dh: 'a', auth: 'b' } },
        }),
      ),
    )
  })

  it('POST /api/push/unsubscribe (Batch 5.5 #20)', async () => {
    const { POST } = await import('@/app/api/push/unsubscribe/route')
    await expectRateLimited(
      POST(jsonReq('http://localhost/api/push/unsubscribe', { endpoint: 'https://push.example/e1' })),
    )
  })

  it('POST /api/gdpr/delete-account', async () => {
    const { POST } = await import('@/app/api/gdpr/delete-account/route')
    await expectRateLimited(POST())
  })

  it('DELETE /api/gdpr/delete-account', async () => {
    const { DELETE } = await import('@/app/api/gdpr/delete-account/route')
    await expectRateLimited(DELETE())
  })

  it('GET /api/gdpr/export', async () => {
    const { GET } = await import('@/app/api/gdpr/export/route')
    await expectRateLimited(GET())
  })

  it('POST /api/stripe/checkout', async () => {
    const { POST } = await import('@/app/api/stripe/checkout/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/stripe/checkout', { priceId: 'price_1' })))
  })

  it('POST /api/stripe/portal', async () => {
    const { POST } = await import('@/app/api/stripe/portal/route')
    await expectRateLimited(POST())
  })

  it('POST /api/stripe/cancel', async () => {
    const { POST } = await import('@/app/api/stripe/cancel/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/stripe/cancel', {})))
  })

  it('DELETE /api/stripe/cancel', async () => {
    const { DELETE } = await import('@/app/api/stripe/cancel/route')
    await expectRateLimited(DELETE())
  })

  it('GET /api/stripe/status', async () => {
    const { GET } = await import('@/app/api/stripe/status/route')
    await expectRateLimited(GET(req('http://localhost/api/stripe/status')))
  })

  it('GET /api/stripe/subscription', async () => {
    const { GET } = await import('@/app/api/stripe/subscription/route')
    await expectRateLimited(GET())
  })

  it('POST /api/circle/invites', async () => {
    const { POST } = await import('@/app/api/circle/invites/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/circle/invites', {})))
  })

  it('POST /api/circle/invites/accept', async () => {
    const { POST } = await import('@/app/api/circle/invites/accept/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/circle/invites/accept', { token: 't'.repeat(20) })))
  })

  it('DELETE /api/circle/invites/[inviteId]', async () => {
    const { DELETE } = await import('@/app/api/circle/invites/[inviteId]/route')
    await expectRateLimited(
      DELETE(req('http://localhost/api/circle/invites/i1', { method: 'DELETE' }), {
        params: Promise.resolve({ inviteId: 'i1' }),
      }),
    )
  })

  it('GET /api/circle/profiles', async () => {
    const { GET } = await import('@/app/api/circle/profiles/route')
    await expectRateLimited(GET())
  })

  it('POST /api/circle/profiles', async () => {
    const { POST } = await import('@/app/api/circle/profiles/route')
    await expectRateLimited(POST(jsonReq('http://localhost/api/circle/profiles', {})))
  })

  it('DELETE /api/circle/profiles/[profileId]', async () => {
    const { DELETE } = await import('@/app/api/circle/profiles/[profileId]/route')
    await expectRateLimited(
      DELETE(req('http://localhost/api/circle/profiles/p1', { method: 'DELETE' }), {
        params: Promise.resolve({ profileId: 'p1' }),
      }),
    )
  })

  it('POST /api/circle/relationships/[relationshipId]/archive', async () => {
    const { POST } = await import('@/app/api/circle/relationships/[relationshipId]/archive/route')
    await expectRateLimited(
      POST(req('http://localhost/api/circle/relationships/r1/archive', { method: 'POST' }), {
        params: Promise.resolve({ relationshipId: 'r1' }),
      }),
    )
  })
})

describe('excluded routes (webhooks/cron) do NOT call assertRateLimit at all', () => {
  // These are deliberately unprotected (signature/secret-verified per the
  // in-code comment added in Batch 1) — confirm they don't accidentally
  // import or invoke assertRateLimit, which would be a silent behavior
  // change (an unauthenticated webhook suddenly gated by a per-IP/user key
  // it was never designed around).
  it('webhooks/stripe module does not import assertRateLimit', async () => {
    const rateLimitModule = await import('@/lib/rate-limit')
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../app/api/webhooks/stripe/route.ts', import.meta.url), 'utf-8'),
    )
    expect(source).not.toContain("from '@/lib/rate-limit'")
    expect(rateLimitModule.assertRateLimit).not.toHaveBeenCalled()
  })

  it('webhooks/revenuecat module does not import assertRateLimit', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../app/api/webhooks/revenuecat/route.ts', import.meta.url), 'utf-8'),
    )
    expect(source).not.toContain("from '@/lib/rate-limit'")
  })

  it('cron/daily-horoscope module does not import assertRateLimit', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../app/api/cron/daily-horoscope/route.ts', import.meta.url), 'utf-8'),
    )
    expect(source).not.toContain("from '@/lib/rate-limit'")
  })

  it('cron/cleanup-deleted-accounts module does not import assertRateLimit', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../../app/api/cron/cleanup-deleted-accounts/route.ts', import.meta.url), 'utf-8'),
    )
    expect(source).not.toContain("from '@/lib/rate-limit'")
  })
})
