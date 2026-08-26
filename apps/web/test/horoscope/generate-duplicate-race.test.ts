import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Batch 5.5 finding #5: /api/horoscope/generate read the cache, and if
 * absent, proceeded straight to a paid OpenRouter call with no exclusivity
 * between the read and the (much later) write — only the final upsert was
 * deduplicated (onConflict), not the AI call itself. Two concurrent
 * requests for the same chart+date both saw no cache and both paid for a
 * full generation.
 *
 * Fix: claim the chart+date pair via a real INSERT against the existing
 * daily_horoscopes_chart_date_unique constraint (UNIQUE(chart_id, date),
 * confirmed live in 20260413141504_schema_hardening.sql) BEFORE calling
 * the AI model — an application-level lock using a constraint that
 * already exists, no migration needed. This test proves that of two
 * concurrent requests, only ONE reaches generateText; the other is
 * rejected at the claim step with 429, before any AI cost is incurred.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_horoscope_race' })),
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
  openrouter: vi.fn(() => 'fake-model-instance'),
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

const generateTextCallCount = vi.hoisted(() => ({ count: 0 }))

vi.mock('ai', () => ({
  generateText: vi.fn(async () => {
    generateTextCallCount.count += 1
    // Simulate real generation latency — long enough that a genuinely
    // concurrent second request would reach this point too if the claim
    // step didn't block it first.
    await new Promise((resolve) => setTimeout(resolve, 10))
    return { text: 'a generated horoscope' }
  }),
  streamText: vi.fn(),
}))

/**
 * WHERE-aware, state-tracking fake — only daily_horoscopes needs to model
 * the real UNIQUE(chart_id, date) constraint (the property under test);
 * every other table returns fixed canned data since it's not part of the
 * race.
 */
function createFakeSupabase() {
  const state = {
    dailyHoroscopes: [] as Array<Record<string, unknown>>,
  }

  function makeHoroscopesChain() {
    const filters: Array<{ col: string; val: unknown }> = []
    let op:
      | { type: 'insert'; row: Record<string, unknown> }
      | { type: 'upsert'; row: Record<string, unknown> }
      | { type: 'delete' }
      | null = null

    const chain = {
      eq(col: string, val: unknown) {
        filters.push({ col, val })
        return chain
      },
      insert(row: Record<string, unknown>) {
        op = { type: 'insert', row }
        return chain
      },
      upsert(row: Record<string, unknown>) {
        op = { type: 'upsert', row }
        return chain
      },
      delete() {
        op = { type: 'delete' }
        return chain
      },
      select() {
        return chain
      },
      single() {
        return chain
      },
      then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        let result: { data: unknown; error: unknown }

        if (op?.type === 'insert') {
          const row = op.row
          const conflict = state.dailyHoroscopes.find(
            (r) => r.chart_id === row.chart_id && r.date === row.date,
          )
          if (conflict) {
            result = {
              data: null,
              error: {
                code: '23505',
                message: 'duplicate key value violates unique constraint "daily_horoscopes_chart_date_unique"',
              },
            }
          } else {
            state.dailyHoroscopes.push({ ...row })
            result = { data: row, error: null }
          }
        } else if (op?.type === 'upsert') {
          const row = op.row
          const existing = state.dailyHoroscopes.find(
            (r) => r.chart_id === row.chart_id && r.date === row.date,
          )
          if (existing) Object.assign(existing, row)
          else state.dailyHoroscopes.push({ ...row })
          result = { data: null, error: null }
        } else if (op?.type === 'delete') {
          const matchIndex = state.dailyHoroscopes.findIndex((r) =>
            filters.every((f) => r[f.col] === f.val),
          )
          if (matchIndex >= 0) state.dailyHoroscopes.splice(matchIndex, 1)
          result = { data: null, error: null }
        } else {
          // select (cache check)
          const matched = state.dailyHoroscopes.find((r) =>
            filters.every((f) => r[f.col] === f.val),
          )
          result = { data: matched ?? null, error: null }
        }

        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  function genericChain(fixedData: unknown) {
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'single', 'maybeSingle', 'upsert', 'insert']
    for (const m of methods) chain[m] = vi.fn(() => chain)
    chain.then = (onFulfilled?: (v: unknown) => unknown) =>
      Promise.resolve({ data: fixedData, error: null }).then(onFulfilled)
    return chain
  }

  const from = vi.fn((table: string) => {
    if (table === 'daily_horoscopes') return makeHoroscopesChain()
    // Premium so checkQuotaAvailable short-circuits without touching
    // subscription_quotas or the increment_quota_if_available RPC — this
    // fake has no RPC support and this test's subject is the duplicate-call
    // race, not quota (see quota-gate.test.ts for that).
    if (table === 'users') {
      return genericChain({
        id: 'user-row-1',
        clerk_id: 'user_horoscope_race',
        subscription_tier: 'premium',
        subscription_status: 'active',
        subscription_provider: 'stripe',
        created_at: null,
        updated_at: null,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        subscription_expires_at: null,
        trial_claimed_at: null,
        deleted_at: null,
        deletion_scheduled_at: null,
      })
    }
    if (table === 'charts') {
      return genericChain({
        id: 'chart-1',
        user_id: 'user_horoscope_race',
        birth_date: '2000-01-01',
        birth_time: '12:00',
        birth_time_known: true,
        latitude: 42.7,
        longitude: 23.3,
      })
    }
    if (table === 'daily_transits') {
      return genericChain({ planet_positions: [] })
    }
    if (table === 'chart_calculations') {
      return genericChain({
        planet_positions: [],
        house_cusps: [],
        aspects: [],
        ascendant: 0,
        mc: 0,
        birth_time_known: true,
      })
    }
    return genericChain(null)
  })

  return { from, _state: state }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/horoscope/generate/route'

function makeRequest() {
  return new Request('http://localhost/api/horoscope/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId: 'chart-1' }),
  })
}

let fake: ReturnType<typeof createFakeSupabase>

beforeEach(() => {
  vi.clearAllMocks()
  generateTextCallCount.count = 0
  fake = createFakeSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
})

describe('POST /api/horoscope/generate — duplicate paid-call race (Batch 5.5 #5)', () => {
  it('only one of two concurrent requests for the same chart+date reaches the paid AI call; the other is rejected at the claim step', async () => {
    const [resA, resB] = await Promise.all([POST(makeRequest()), POST(makeRequest())])

    const statuses = [resA.status, resB.status].sort()
    // One succeeds (200), one is turned away at the claim (429) — never
    // both succeeding, and never both paying for generation.
    expect(statuses).toEqual([200, 429])
    expect(generateTextCallCount.count).toBe(1)
  })
})
