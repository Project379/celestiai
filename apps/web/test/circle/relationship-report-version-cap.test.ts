import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 2026-08-26 sweep finding #5, corrected: these routes generate report
 * CONTENT from a deterministic template (no external LLM call — see
 * lib/circle/report.ts), so this is not an AI-spend control. What was
 * genuinely uncapped: version rows per space, each triggering a real Swiss
 * Ephemeris compatibility compute, with only a 5/min rate limit as a brake
 * — the same "rate limit but no hard cap" shape birth-data had (sweep
 * finding #3) before that got a MAX_CHARTS_PER_USER ceiling. This test
 * proves the mirrored fix here: MAX_REPORT_VERSIONS_PER_PAIR blocks once
 * baselineVersion reaches it, BEFORE the expensive compute runs. Per
 * standing discipline, run against the pre-fix route (no cap check) and
 * confirmed to fail (200, not 429) before the fix was restored.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_a' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => undefined),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

const buildSpaceComputation = vi.hoisted(() => vi.fn(async () => ({
  compatibilitySummary: { headline_score: 70 },
  synastryAspects: [],
  compositeChartData: {},
})))

vi.mock('@/lib/circle/report', () => ({
  buildCompatibilityReportContent: vi.fn(() => ({ overview: {}, domains: {} })),
  MAX_REPORT_VERSIONS_PER_PAIR: 50,
}))

vi.mock('@/lib/circle/service', () => ({
  getSpaceById: vi.fn(async () => ({
    id: 'space_1',
    label: 'Test Space',
    relationship_type: 'romantic',
  })),
  listSpaceMembers: vi.fn(async () => [
    { user_id: 'user_a', chart_id: 'chart_a' },
    { user_id: 'user_b', chart_id: 'chart_b' },
  ]),
  getChartById: vi.fn(async (chartId: string) => ({ id: chartId, name: chartId })),
  getUserTier: vi.fn(async () => 'premium' as const),
  buildSpaceComputation,
}))

function makeGenericChain(fixedData: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'maybeSingle', 'update', 'insert']
  for (const m of methods) chain[m] = vi.fn(() => chain)
  chain.then = (onFulfilled?: (v: unknown) => unknown) =>
    Promise.resolve({ data: fixedData, error: null }).then(onFulfilled)
  return chain
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/circle/relationships/[relationshipId]/report/route'

function makeRequest() {
  return new Request('http://localhost/api/circle/relationships/space_1/report', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

function makeContext() {
  return { params: Promise.resolve({ relationshipId: 'space_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/circle/relationships/[relationshipId]/report — version cap (2026-08-26 sweep #5)', () => {
  it('returns 429 without running the ephemeris compute once the space is at MAX_REPORT_VERSIONS_PER_PAIR', async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'connection_reports') return makeGenericChain({ version: 50 })
        return makeGenericChain(null)
      },
    } as never)

    const res = await POST(makeRequest(), makeContext())

    // Pre-fix, this would be 200 — the route had no ceiling, only a 5/min
    // rate limit, and would have gone on to run buildSpaceComputation.
    expect(res.status).toBe(429)
    expect(buildSpaceComputation).not.toHaveBeenCalled()
  })

  it('proceeds normally one below the cap', async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'connection_reports') return makeGenericChain({ version: 49 })
        if (table === 'connection_spaces') return makeGenericChain(null)
        return makeGenericChain(null)
      },
    } as never)

    const res = await POST(makeRequest(), makeContext())

    expect(res.status).toBe(200)
    expect(buildSpaceComputation).toHaveBeenCalledTimes(1)
  })
})
