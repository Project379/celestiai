import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'
import { makeAppUser } from '../mocks/fixtures'

/**
 * Frozen tier definition (2026-09-01) — Oracle gates on /api/oracle/generate.
 *
 *   FREE   = ONE `general` reading for the LIFETIME of the account
 *            (users.free_oracle_used_at). love/career/health = premium.
 *            regenerate = premium.
 *   PREMIUM = all four topics, regenerate, 300/month safety-net cap.
 *
 * Every gate returns 429 + `code: 'CAP_REACHED'` (so the existing client
 * mapping routes it to the conversion surface) + a `reason` that picks the
 * copy.
 *
 * Prove-red discipline: run this file with
 *   git stash push apps/web/app/api/oracle/generate/route.ts
 * to restore the pre-frozen route. Against that route:
 *   - "free love -> 429 premium_topic" FAILS (pre-change: topic ungated,
 *     love returned 200).
 *   - "free general, second call -> 429 free_used" FAILS (pre-change: the
 *     free allowance was 3/month via subscription_quotas, not 1/lifetime,
 *     so the second call returned 200).
 *   - "free regenerate -> 429 premium_regenerate" FAILS (pre-change: free
 *     regenerate was allowed, quota-exempt for a live cached reading).
 */

const AI_MOCK_MODEL = 'fake-model-instance'

const userState = vi.hoisted(() => ({ tier: 'free' as 'free' | 'premium' }))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_tier_gate_test' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () =>
    makeAppUser({ clerk_id: 'user_tier_gate_test', subscription_tier: userState.tier }),
  ),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
  RETRY_LATER_MESSAGE: 'retry later',
}))

vi.mock('@/lib/audit', () => ({ logAuditEvent: vi.fn() }))
vi.mock('@/lib/ai/check-bg-output', () => ({ checkAndLogGeneration: vi.fn(async () => {}) }))
vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  openrouter: vi.fn(() => AI_MOCK_MODEL),
  isUpstreamAiError: vi.fn(() => false),
}))
vi.mock('@/lib/oracle/prompts', () => ({ buildSystemPrompt: vi.fn(() => 'system prompt') }))
vi.mock('@/lib/oracle/chart-to-prompt', () => ({ chartToPromptText: vi.fn(() => 'chart prompt text') }))
vi.mock('@stellaeum/core/oracle/planet-parser', () => ({ stripSentinels: vi.fn((t: string) => t) }))
vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({ text: 'a generated reading' })),
  streamText: vi.fn(),
}))

// Premium monthly quota — stateful, mirrors the real RPC shape. Only the
// premium branch touches this now.
const quotaState = vi.hoisted(() => ({ used: 0, limit: 300 }))
vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable: vi.fn(async () => ({
    available: quotaState.used < quotaState.limit,
    used: quotaState.used,
    limit: quotaState.limit,
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
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
  quotaCapReachedResponse: vi.fn(() =>
    Response.json({ error: 'temporarily unavailable' }, { status: 503 }),
  ),
}))

// Free lifetime marker — stateful fake of the helper; the real
// freeOracleGateResponse is kept so the response shape is exercised.
const freeOracleState = vi.hoisted(() => ({ used: false }))
const claimSpy = vi.hoisted(() => vi.fn())
const releaseSpy = vi.hoisted(() => vi.fn())
vi.mock('@/lib/subscriptions/free-oracle', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/subscriptions/free-oracle')>()
  return {
    ...actual,
    claimFreeOracleReading: vi.fn(async () => {
      claimSpy()
      if (freeOracleState.used) return { claimed: false, columnMissing: false }
      freeOracleState.used = true
      return { claimed: true, columnMissing: false }
    }),
    releaseFreeOracleReading: vi.fn(async () => {
      releaseSpy()
      freeOracleState.used = false
    }),
  }
})

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { generateText } from 'ai'
import { incrementQuotaUsage } from '@/lib/subscriptions/quota'
import { POST } from '@/app/api/oracle/generate/route'
import { NEVER_EXPIRES_AT } from '@/lib/oracle/expiry'

let mockSupabase: MockSupabase

/**
 * Wrap createServiceSupabaseClient's return so every ai_readings upsert
 * payload is recorded. Uses the untouched mockSupabase.from underneath
 * (no self-spy → no recursion). Call at the top of a test, after
 * beforeEach has re-seeded the default mockReturnValue.
 */
function captureAiReadingsUpserts(): Array<Record<string, unknown>> {
  const payloads: Array<Record<string, unknown>> = []
  vi.mocked(createServiceSupabaseClient).mockReturnValue({
    from: (table: string) => {
      const builder = mockSupabase.from(table) as Record<string, unknown> & {
        upsert: (p: Record<string, unknown>, o?: unknown) => unknown
      }
      if (table === 'ai_readings') {
        const realUpsert = builder.upsert
        builder.upsert = (p, o) => {
          payloads.push(p)
          return realUpsert(p, o)
        }
      }
      return builder
    },
  } as never)
  return payloads
}

function seedChartAndNoCache(topic = 'general') {
  mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user_tier_gate_test' } })
  mockSupabase.push('ai_readings', { data: null }) // cache check — nothing
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
      house_cusps: [],
      aspects: [],
      ascendant: 0,
      mc: 0,
      birth_time_known: true,
    },
  })
  mockSupabase.push('ai_readings', { data: null }) // final upsert — ignored
  return topic
}

function seedChartWithLiveReading() {
  mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user_tier_gate_test' } })
  mockSupabase.push('ai_readings', {
    data: {
      id: 'reading-1',
      content: 'old',
      generated_at: '2026-08-01T00:00:00.000Z',
      expires_at: '2026-12-01T00:00:00.000Z',
      last_regenerated_at: '2026-08-01T00:00:00.000Z',
    },
  })
  mockSupabase.push('chart_calculations', {
    data: {
      planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
      house_cusps: [],
      aspects: [],
      ascendant: 0,
      mc: 0,
      birth_time_known: true,
    },
  })
  mockSupabase.push('ai_readings', { data: null })
}

function req(body: Record<string, unknown>) {
  return new Request('http://localhost/api/oracle/generate?format=json', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  userState.tier = 'free'
  quotaState.used = 0
  freeOracleState.used = false
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('POST /api/oracle/generate — FREE tier gates (frozen definition 2026-09-01)', () => {
  it('allows the one free `general` reading and claims the lifetime marker', async () => {
    seedChartAndNoCache('general')
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))

    expect(res.status).toBe(200)
    expect(claimSpy).toHaveBeenCalledTimes(1)
    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(1)
    // Free path must NOT touch the premium monthly counter.
    expect(vi.mocked(incrementQuotaUsage)).not.toHaveBeenCalled()
  })

  it('blocks the SECOND free `general` reading with CAP_REACHED / free_used', async () => {
    seedChartAndNoCache('general')
    expect((await POST(req({ chartId: 'chart-1', topic: 'general' }))).status).toBe(200)

    seedChartAndNoCache('general')
    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.reason).toBe('free_used')
    // The blocked call must not have reached generation.
    expect(vi.mocked(generateText)).toHaveBeenCalledTimes(1)
  })

  it('blocks a premium topic (love) with CAP_REACHED / premium_topic, before any claim or generation', async () => {
    seedChartAndNoCache('love')
    const res = await POST(req({ chartId: 'chart-1', topic: 'love' }))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.reason).toBe('premium_topic')
    expect(claimSpy).not.toHaveBeenCalled()
    expect(vi.mocked(generateText)).not.toHaveBeenCalled()
  })

  it('blocks regenerate with CAP_REACHED / premium_regenerate', async () => {
    seedChartWithLiveReading()
    const res = await POST(req({ chartId: 'chart-1', topic: 'general', regenerate: true }))

    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.code).toBe('CAP_REACHED')
    expect(body.reason).toBe('premium_regenerate')
    expect(claimSpy).not.toHaveBeenCalled()
  })
})

describe('POST /api/oracle/generate — PREMIUM tier (frozen definition 2026-09-01)', () => {
  beforeEach(() => {
    userState.tier = 'premium'
  })

  it('allows a premium topic (love) through the monthly quota, not the lifetime marker', async () => {
    seedChartAndNoCache('love')
    const res = await POST(req({ chartId: 'chart-1', topic: 'love' }))

    expect(res.status).toBe(200)
    expect(vi.mocked(incrementQuotaUsage)).toHaveBeenCalledTimes(1)
    expect(claimSpy).not.toHaveBeenCalled()
  })

  it('allows regenerate for premium', async () => {
    seedChartWithLiveReading()
    const res = await POST(req({ chartId: 'chart-1', topic: 'general', regenerate: true }))

    expect(res.status).toBe(200)
  })
})

/**
 * The free lifetime `general` reading must stay readable forever — both
 * the route's step-5 cache check and GET /api/oracle/readings filter
 * `expires_at > now`, so it is written with a far-future sentinel.
 *
 * Prove-red (git stash push apps/web/app/api/oracle/generate/route.ts):
 * against the pre-fix route every reading got generatedAt + 7 days, so
 *   - "free general -> expires_at is NEVER_EXPIRES_AT" FAILS
 *   - "non-expiring row stays non-expiring on premium regenerate" FAILS
 * The premium-topic case ("~7 days, not the sentinel") already passed.
 */
describe('POST /api/oracle/generate — reading expiry (2026-09-01)', () => {
  it('writes the free `general` reading with a non-expiring sentinel', async () => {
    const upserts = captureAiReadingsUpserts()
    seedChartAndNoCache('general')

    const res = await POST(req({ chartId: 'chart-1', topic: 'general' }))

    expect(res.status).toBe(200)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.expires_at).toBe(NEVER_EXPIRES_AT)
  })

  it('writes a premium topic reading with the 7-day cache window, not the sentinel', async () => {
    userState.tier = 'premium'
    const upserts = captureAiReadingsUpserts()
    seedChartAndNoCache('love')

    const res = await POST(req({ chartId: 'chart-1', topic: 'love' }))

    expect(res.status).toBe(200)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.expires_at).not.toBe(NEVER_EXPIRES_AT)
    const days =
      (new Date(upserts[0]!.expires_at as string).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)
  })

  it('keeps a non-expiring row non-expiring when a premium user regenerates it', async () => {
    userState.tier = 'premium'
    const upserts = captureAiReadingsUpserts()
    mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user_tier_gate_test' } })
    mockSupabase.push('ai_readings', {
      data: {
        id: 'reading-1',
        content: 'old',
        generated_at: '2026-05-01T00:00:00.000Z',
        expires_at: NEVER_EXPIRES_AT,
        last_regenerated_at: '2026-05-01T00:00:00.000Z',
      },
    })
    mockSupabase.push('chart_calculations', {
      data: {
        planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
        house_cusps: [],
        aspects: [],
        ascendant: 0,
        mc: 0,
        birth_time_known: true,
      },
    })
    mockSupabase.push('ai_readings', { data: null })

    const res = await POST(req({ chartId: 'chart-1', topic: 'general', regenerate: true }))

    expect(res.status).toBe(200)
    expect(upserts).toHaveLength(1)
    expect(upserts[0]!.expires_at).toBe(NEVER_EXPIRES_AT)
  })
})
