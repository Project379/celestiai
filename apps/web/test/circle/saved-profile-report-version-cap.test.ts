import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Sibling of relationship-report-version-cap.test.ts — same fix, same
 * reasoning (see that file's header). Covers saved_people_reports (crush
 * profiles).
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'user_test' })),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => undefined),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

const buildSavedProfileComputation = vi.hoisted(() =>
  vi.fn(async () => ({ compatibilitySummary: { headline_score: 60 } })),
)

vi.mock('@/lib/circle/report', () => ({
  buildSavedProfileFullContent: vi.fn(() => ({ mode: 'full', overview: {} })),
  buildSavedProfileTeaserContent: vi.fn(() => ({ mode: 'teaser', overview: {} })),
  MAX_REPORT_VERSIONS_PER_PAIR: 50,
}))

vi.mock('@/lib/circle/service', () => ({
  getLatestChartRowForUser: vi.fn(async () => ({ id: 'chart_user', name: 'My Chart' })),
  getSavedProfileForUser: vi.fn(async () => ({ id: 'profile_1', name: 'Crush', user_id: 'user_test' })),
  getUserTier: vi.fn(async () => 'premium' as const),
  buildSavedProfileComputation,
  getLatestSavedProfileReport: vi.fn(),
}))

function makeGenericChain(fixedData: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'order', 'limit', 'single', 'maybeSingle', 'insert']
  for (const m of methods) chain[m] = vi.fn(() => chain)
  chain.then = (onFulfilled?: (v: unknown) => unknown) =>
    Promise.resolve({ data: fixedData, error: null }).then(onFulfilled)
  return chain
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/circle/profiles/[profileId]/report/route'

function makeRequest() {
  return new Request('http://localhost/api/circle/profiles/profile_1/report', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

function makeContext() {
  return { params: Promise.resolve({ profileId: 'profile_1' }) }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/circle/profiles/[profileId]/report — version cap (2026-08-26 sweep #5)', () => {
  it('returns 429 without running the compatibility compute once the profile is at MAX_REPORT_VERSIONS_PER_PAIR', async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue({
      from: () => makeGenericChain({ version: 50 }),
    } as never)

    const res = await POST(makeRequest(), makeContext())

    // Pre-fix, this would be 200 — no ceiling, only a 5/min rate limit.
    expect(res.status).toBe(429)
    expect(buildSavedProfileComputation).not.toHaveBeenCalled()
  })

  it('proceeds normally one below the cap', async () => {
    vi.mocked(createServiceSupabaseClient).mockReturnValue({
      from: () => makeGenericChain({ version: 49 }),
    } as never)

    const res = await POST(makeRequest(), makeContext())

    expect(res.status).toBe(200)
    expect(buildSavedProfileComputation).toHaveBeenCalledTimes(1)
  })
})
