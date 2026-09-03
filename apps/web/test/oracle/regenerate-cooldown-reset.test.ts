import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 2026-08-26 sweep finding #14: a FRESH (non-regeneration) generation wrote
 * `last_regenerated_at: null` unconditionally whenever `isRegenerationOfExisting`
 * was false — including when the write was an UPSERT against an EXISTING row
 * whose cache-check SELECT simply missed (7-day TTL expired) while the
 * physical row, and its real `last_regenerated_at` from a PRIOR regeneration,
 * still existed in Postgres. That silently cleared the 24h regenerate
 * cooldown a moment later: the very next `regenerate:true` call found
 * `last_regenerated_at` falsy and skipped the cooldown check at step 6
 * entirely.
 *
 * Fix: a fresh generation now OMITS `last_regenerated_at` from the upsert
 * payload rather than writing null — Postgres `ON CONFLICT DO UPDATE SET`
 * only touches columns present in the payload, so the prior value survives.
 *
 * This test drives the real sequence: regenerate an existing reading (sets
 * last_regenerated_at), then simulate the 7-day cache expiring (the SELECT
 * cache-check misses, but the physical row/column survives), then a fresh
 * generation fires against that same chart+topic, then an immediate
 * regenerate:true. Per standing discipline, this test was run against the
 * pre-fix route.ts (`last_regenerated_at: isRegenerationOfExisting ? ... :
 * null` written unconditionally) and confirmed to FAIL — the cooldown never
 * fired — before the fix was restored.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_cooldown_reset' })),
}))

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/users/ensure-user', () => ({
  ensureUserRecord: vi.fn(async () => ({
    id: 'user-row-1',
    clerk_id: 'user_cooldown_reset',
    subscription_tier: 'premium', // premium: no quota interaction, isolates the cooldown bug
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
  })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => {}),
}))

// This test's subject is the last_regenerated_at reset bug, not quota —
// bypass quota entirely (2026-08-26: premium now shares the real quota
// gate too, at PREMIUM_MONTHLY_LIMIT; the fixture user here is premium
// specifically to isolate the cooldown bug from quota noise, per the file
// header above).
vi.mock('@/lib/subscriptions/quota', () => ({
  checkQuotaAvailable: vi.fn(async () => ({
    available: true,
    used: 0,
    limit: 300,
    periodStart: new Date('2026-08-01T00:00:00.000Z'),
  })),
  incrementQuotaUsage: vi.fn(async () => ({ success: true, newUsed: 1 })),
  decrementQuotaUsage: vi.fn(async () => true),
  quotaCapReachedResponse: vi.fn(() => Response.json({ error: 'cap (test)' }, { status: 429 })),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

vi.mock('@/lib/ai/check-bg-output', () => ({
  checkAndLogGeneration: vi.fn(async () => {}),
}))

vi.mock('@/lib/ai/client', () => ({
  AI_MODEL: 'fake-model',
  ORACLE_FALLBACK_MODEL: 'fake-oracle-fallback-model',
  gemini: vi.fn(() => 'fake-model-instance'),
  isUpstreamAiError: vi.fn(() => false),
}))

vi.mock('@/lib/oracle/prompts', () => ({
  buildSystemPrompt: vi.fn(() => 'system prompt'),
}))

vi.mock('@/lib/oracle/chart-to-prompt', () => ({
  chartToPromptText: vi.fn(() => 'chart prompt text'),
}))

vi.mock('@stellaeum/core/oracle/planet-parser', () => ({
  stripSentinels: vi.fn((text: string) => text),
}))

vi.mock('ai', () => ({
  generateText: vi.fn(async () => ({
    output: { content: 'a generated reading' },
    text: '',
  })),
  Output: { object: vi.fn((options) => options) },
  streamText: vi.fn(),
}))

/**
 * Stateful fake modeling the property under test: an UPSERT's ON CONFLICT
 * DO UPDATE only overwrites columns present in the payload (real Postgres
 * semantics) — NOT a full-row replace. The cache-check SELECT can be told to
 * "miss" (simulating 7-day TTL expiry) independently of whether the
 * physical row still exists, which is exactly the gap the pre-fix code got
 * wrong.
 */
function createFakeSupabase() {
  const state = {
    row: null as Record<string, unknown> | null,
    cacheCheckMisses: false,
  }

  function makeReadingsChain() {
    const filters: Array<{ col: string; val: unknown }> = []
    let op: { type: 'upsert'; row: Record<string, unknown> } | null = null

    const chain = {
      eq(col: string, val: unknown) {
        filters.push({ col, val })
        return chain
      },
      gt() {
        return chain
      },
      upsert(row: Record<string, unknown>) {
        op = { type: 'upsert', row }
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

        if (op?.type === 'upsert') {
          const payload = op.row
          if (state.row) {
            // ON CONFLICT DO UPDATE SET <only payload's own keys> — columns
            // absent from payload keep their existing value. This is the
            // exact behavior the pre-fix code got wrong by always including
            // last_regenerated_at (sometimes as an explicit null).
            Object.assign(state.row, payload)
          } else {
            state.row = { ...payload }
          }
          result = { data: null, error: null }
        } else {
          // select (cache check)
          if (state.cacheCheckMisses || !state.row) {
            result = { data: null, error: null }
          } else {
            result = { data: state.row, error: null }
          }
        }

        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  function genericChain(fixedData: unknown) {
    const chain: Record<string, unknown> = {}
    const methods = ['select', 'eq', 'single']
    for (const m of methods) chain[m] = vi.fn(() => chain)
    chain.then = (onFulfilled?: (v: unknown) => unknown) =>
      Promise.resolve({ data: fixedData, error: null }).then(onFulfilled)
    return chain
  }

  const from = vi.fn((table: string) => {
    if (table === 'ai_readings') return makeReadingsChain()
    if (table === 'charts') {
      return genericChain({ id: 'chart-1', user_id: 'user_cooldown_reset' })
    }
    if (table === 'chart_calculations') {
      return genericChain({
        planet_positions: [{ planet: 'sun', sign: 'aries', house: 1, longitude: 0 }],
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

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/oracle/generate/route'

let fake: ReturnType<typeof createFakeSupabase>

function makeRequest(regenerate: boolean) {
  return new Request('http://localhost/api/oracle/generate?format=json', {
    method: 'POST',
    body: JSON.stringify({ chartId: 'chart-1', topic: 'general', regenerate }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
})

describe('POST /api/oracle/generate — regenerate cooldown must survive a fresh generation (2026-08-26 sweep #14)', () => {
  it('does not reset last_regenerated_at (and therefore the 24h cooldown) when a fresh generation upserts over an existing row whose cache-check missed', async () => {
    // 1. First-ever generation — no existing row, genuinely fresh.
    let res = await POST(makeRequest(false))
    expect(res.status).toBe(200)
    expect(fake._state.row?.last_regenerated_at).toBeFalsy()

    // 2. Immediate regenerate:true — a real regeneration, sets
    //    last_regenerated_at.
    res = await POST(makeRequest(true))
    expect(res.status).toBe(200)
    const firstRegenTimestamp = fake._state.row?.last_regenerated_at
    expect(firstRegenTimestamp).toBeTruthy()

    // 3. Simulate the 7-day cache TTL expiring: the cache-check SELECT
    //    misses, but the physical row (and its last_regenerated_at) is
    //    still there in Postgres. A "fresh" generation fires.
    fake._state.cacheCheckMisses = true
    res = await POST(makeRequest(false))
    expect(res.status).toBe(200)
    fake._state.cacheCheckMisses = false

    // This is the assertion that FAILS against the pre-fix code: pre-fix,
    // step 3's upsert wrote last_regenerated_at: null unconditionally,
    // wiping out the timestamp from step 2.
    expect(fake._state.row?.last_regenerated_at).toBe(firstRegenTimestamp)

    // 4. Immediate regenerate:true again — must be blocked by the 24h
    //    cooldown, because last_regenerated_at survived step 3.
    res = await POST(makeRequest(true))
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toBe('Можеш да регенерираш веднъж на ден')
  })
})
