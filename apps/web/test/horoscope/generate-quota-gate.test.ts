import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * 2026-08-26 sweep, finding #2 (CRITICAL): /api/horoscope/generate called no
 * quota check of any kind — checkQuotaAvailable/incrementQuotaUsage were
 * only ever wired into oracle/generate (grep confirmed one call site,
 * repo-wide). Chained with finding #3 (chart creation was uncapped — see
 * chart-limit assertions in ../charts/birth-data.test.ts), a free account
 * could loop POST /api/birth-data to mint a fresh chart, then POST
 * /api/horoscope/generate for it — each new chart is a fresh (chart_id,
 * date) cache key the existing daily_horoscopes cache can't dedupe, so
 * every chart unlocked another paid AI call with nothing
 * capping the total.
 *
 * This test proves the fix (checkQuotaAvailable/incrementQuotaUsage wired
 * into this route the same way as oracle/generate) by driving a free-tier
 * account through the free-tier cap across distinct charts. Per standing
 * discipline, this test was run against the pre-fix route.ts (no quota
 * import, no gate) and confirmed to FAIL — every call returned 200 with no
 * cap ever reached — before the fix was restored.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_free_horoscope_quota' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () => ({
    id: 'user-row-1',
    clerk_id: 'user_free_horoscope_quota',
    subscription_tier: 'free',
    subscription_status: 'inactive',
    subscription_provider: 'stripe',
    created_at: null,
    updated_at: null,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_expires_at: null,
    trial_claimed_at: null,
    deleted_at: null,
    deletion_scheduled_at: null,
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/ai/check-bg-output', () => ({
  checkAndLogGeneration: vi.fn(async () => {}),
}))

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  gemini: vi.fn((model: string) => `fake-model-instance:${model}`),
}))

vi.mock('@/lib/horoscope/prompts', () => ({
  buildDailyHoroscopePrompt: vi.fn(() => 'system prompt'),
}))

vi.mock('@/lib/horoscope/transit-analysis', () => ({
  buildTransitOverview: vi.fn(() => ({ activeTransits: [], lunarEvents: [] })),
}))

vi.mock('@/lib/horoscope/transit-to-prompt', () => ({
  transitAndNatalToPromptText: vi.fn(() => 'prompt text'),
}))

vi.mock('@stellaeum/astrology', () => ({
  calculateDailyTransits: vi.fn(() => ({ planets: [] })),
  calculateNatalChart: vi.fn(() => ({
    planets: [],
    houses: [],
    aspects: [],
    ascendant: 0,
    mc: 0,
    birthTimeKnown: true,
  })),
  calculateTransitAspects: vi.fn(() => []),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({
    output: { content: 'a generated horoscope' },
    text: '',
  })),
  Output: { object: vi.fn((options) => options) },
  streamText: vi.fn(),
}))

// Stateful quota mock — mirrors the real RPC closely enough to prove the
// ROUTE's gating logic (quota.ts's own internals are covered by
// quota.test.ts). The exploit this closes: an uncapped loop of distinct
// charts, each a cache miss, must still be bounded by ONE shared cap.
const quotaState = vi.hoisted(() => ({ used: 0, limit: 3 }))

vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable: vi.fn(async () => ({
    available: quotaState.used < quotaState.limit,
    used: quotaState.used,
    limit: quotaState.limit,
    periodStart: new Date('2026-08-01T00:00:00.000Z'),
  })),
  incrementQuotaUsage: vi.fn(async () => {
    if (quotaState.used >= quotaState.limit) return { success: false, newUsed: null }
    quotaState.used += 1
    return { success: true, newUsed: quotaState.used }
  }),
  decrementQuotaUsage: vi.fn(async () => {
    quotaState.used = Math.max(0, quotaState.used - 1)
    return true
  }),
  // Real implementation branches on tier (free: 429+CAP_REACHED+number,
  // premium: 503, invisible) — this test only exercises the free-tier
  // user fixture above, so a fixed free-shaped response is enough to
  // isolate the route's gating logic from quota.ts's own tier-split
  // internals.
  quotaCapReachedResponse: vi.fn((user: { subscription_tier: string }, quota: { limit: number }) =>
    Response.json(
      { error: 'cap reached (test)', code: 'CAP_REACHED', cap: quota.limit, tier: user.subscription_tier },
      { status: 429 },
    ),
  ),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { POST } from '@/app/api/horoscope/generate/route'

let mockSupabase: MockSupabase

// Each call targets a DIFFERENT chart id — the shape of the real exploit,
// where a free account loops chart creation to manufacture fresh cache keys
// rather than hitting the same chart twice.
function seedRouteQueries(chartId: string) {
  mockSupabase.push('charts', {
    data: {
      id: chartId,
      user_id: 'user_free_horoscope_quota',
      birth_date: '2000-01-01',
      birth_time: '12:00',
      birth_time_known: true,
      latitude: 42.7,
      longitude: 23.3,
    },
  })
  // Cache check — no cached horoscope for this (new) chart+date.
  mockSupabase.push('daily_horoscopes', { data: null })
  mockSupabase.push('daily_transits', { data: { planet_positions: [] } })
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [],
      house_cusps: [],
      aspects: [],
      ascendant: 0,
      mc: 0,
      birth_time_known: true,
    },
  })
  // Claim-slot insert — succeeds (no prior claim for this chart+date).
  mockSupabase.push('daily_horoscopes', { data: { chart_id: chartId }, error: null })
  // Final upsert after generation — return value ignored by the route.
  mockSupabase.push('daily_horoscopes', { data: null })
}

function makeRequest(chartId: string) {
  return new Request('http://localhost/api/horoscope/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  quotaState.used = 0
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/horoscope/generate — quota gate (2026-08-26 sweep #2, chained with #3)', () => {
  it('caps a free account at the shared monthly limit across DISTINCT charts, not just repeats of one chart', async () => {
    // Pre-fix, this loop would return 200 forever — no quota import existed
    // on this route at all, so a free account creating a new chart per
    // request had no ceiling other than the 5/min burst limiter.
    for (let i = 0; i < quotaState.limit; i++) {
      seedRouteQueries(`chart-${i}`)
      const res = await POST(makeRequest(`chart-${i}`))
      expect(res.status).toBe(200)
    }

    expect(quotaState.used).toBe(quotaState.limit)

    // The (limit + 1)th call, against yet another brand-new chart, must now
    // be blocked — this is the assertion that fails against the pre-fix
    // code (pre-fix: 200, unbounded).
    seedRouteQueries('chart-overflow')
    const blockedRes = await POST(makeRequest('chart-overflow'))
    expect(blockedRes.status).toBe(429)
    const body = await blockedRes.json()
    expect(body.code).toBe('CAP_REACHED')
  })

  it('does not consume quota on a cache hit', async () => {
    mockSupabase.push('charts', {
      data: {
        id: 'chart-cached',
        user_id: 'user_free_horoscope_quota',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
      },
    })
    mockSupabase.push('daily_horoscopes', {
      data: { content: 'cached content', generated_at: '2026-08-25T00:00:00.000Z' },
    })

    const res = await POST(makeRequest('chart-cached'))

    expect(res.status).toBe(200)
    expect(quotaState.used).toBe(0)
  })

  it('makes one provider request with retries disabled and removes leaked self-talk', async () => {
    seedRouteQueries('chart-single-call')
    vi.mocked(generateText).mockResolvedValueOnce({
      output: {
        content: 'Финален български хороскоп. \\*(Wait, let us construct carefully.)\\*',
      },
      text: '',
    } as never)

    const res = await POST(makeRequest('chart-single-call'))

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      content: 'Финален български хороскоп.',
    })
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(vi.mocked(generateText).mock.calls[0]?.[0]).toMatchObject({
      maxRetries: 0,
      model: 'fake-model-instance:fake-model',
      providerOptions: {
        google: {
          thinkingConfig: { includeThoughts: false, thinkingLevel: 'low' },
        },
      },
    })
  })

  it('returns a retryable 503 and refunds quota after the single Gemini call fails', async () => {
    seedRouteQueries('chart-overloaded')
    const overload = Object.assign(new Error('high demand'), {
      isRetryable: true,
      statusCode: 503,
    })
    vi.mocked(generateText).mockRejectedValueOnce(overload)

    const res = await POST(makeRequest('chart-overloaded'))

    expect(res.status).toBe(503)
    expect(res.headers.get('Retry-After')).toBe('30')
    await expect(res.json()).resolves.toMatchObject({
      code: 'AI_TEMPORARILY_UNAVAILABLE',
    })
    expect(generateText).toHaveBeenCalledTimes(1)
    expect(quotaState.used).toBe(0)
  })

  it('treats an empty claim row as in-progress without consuming quota or calling Gemini', async () => {
    mockSupabase.push('charts', {
      data: {
        id: 'chart-generating',
        user_id: 'user_free_horoscope_quota',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
      },
    })
    mockSupabase.push('daily_horoscopes', {
      data: { content: '', generated_at: '2026-09-01T00:00:00.000Z' },
    })

    const res = await POST(makeRequest('chart-generating'))

    expect(res.status).toBe(202)
    expect(res.headers.get('Retry-After')).toBe('3')
    await expect(res.json()).resolves.toMatchObject({ generating: true })
    expect(generateText).not.toHaveBeenCalled()
    expect(quotaState.used).toBe(0)
  })
})
