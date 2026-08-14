import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Same fix, same test shape as relationship-report-race.test.ts — see
 * that file's header for the full reasoning. This covers the sibling
 * route (saved_people_reports / crush profiles), which is already live
 * in production AND already mobile-reachable via useAnalyzeSavedProfile
 * (shipped in Batch 4 sub-batch A), making it the more urgent of the two
 * report-route fixes.
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

vi.mock('@/lib/circle/report', () => ({
  buildSavedProfileFullContent: vi.fn(() => ({ mode: 'full', overview: {} })),
  buildSavedProfileTeaserContent: vi.fn(() => ({ mode: 'teaser', overview: {} })),
}))

vi.mock('@/lib/circle/service', () => ({
  getLatestChartRowForUser: vi.fn(async () => ({ id: 'chart_user', name: 'My Chart' })),
  getSavedProfileForUser: vi.fn(async () => ({ id: 'profile_1', name: 'Crush', user_id: 'user_test' })),
  getUserTier: vi.fn(async () => 'premium' as const),
  buildSavedProfileComputation: vi.fn(async () => ({
    compatibilitySummary: { headline_score: 60 },
  })),
  // Real implementation reads from the same fake supabase — see
  // beforeEach, where this is bound to the fake's table lookup so the
  // route's post-conflict fetch reflects the actual winner.
  getLatestSavedProfileReport: vi.fn(),
}))

type Filter = { col: string; op: 'eq' | 'gt'; val: unknown }

function matches(row: Record<string, unknown>, filters: Filter[]) {
  return filters.every((f) => {
    const rowVal = row[f.col]
    if (f.op === 'eq') return rowVal === f.val
    return typeof rowVal === 'string' && typeof f.val === 'string' && rowVal > f.val
  })
}

function createFakeSupabase() {
  const state = { reports: [] as Array<Record<string, unknown>> }
  let idCounter = 0

  function execute(
    filters: Filter[],
    op: { type: 'insert'; rows: Record<string, unknown>[] } | null,
    wantSingle: boolean,
    orderDesc: string | null,
  ) {
    if (op?.type === 'insert') {
      // Models saved_people_reports_unique_version — UNIQUE(profile_id,
      // version), live in the real schema since the original migration.
      for (const candidate of op.rows) {
        const conflict = state.reports.find(
          (r) => r.profile_id === candidate.profile_id && r.version === candidate.version,
        )
        if (conflict) {
          return {
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint "saved_people_reports_unique_version"' },
          }
        }
      }
      const inserted = op.rows.map((r) => ({ id: `row_${++idCounter}`, ...r }))
      state.reports.push(...inserted)
      return { data: wantSingle ? inserted[0] : inserted, error: null }
    }

    let matched = state.reports.filter((r) => matches(r, filters))
    if (orderDesc) {
      matched = [...matched].sort((a, b) => (Number(b[orderDesc]) || 0) - (Number(a[orderDesc]) || 0))
    }
    if (wantSingle) return { data: matched[0] ?? null, error: null }
    return { data: matched, error: null }
  }

  function makeChain() {
    const filters: Filter[] = []
    let op: { type: 'insert'; rows: Record<string, unknown>[] } | null = null
    let wantSingle = false
    let orderDesc: string | null = null

    const chain = {
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val })
        return chain
      },
      insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
        op = { type: 'insert', rows: Array.isArray(rows) ? rows : [rows] }
        return chain
      },
      select() {
        return chain
      },
      order(col: string, opts?: { ascending?: boolean }) {
        if (opts?.ascending === false) orderDesc = col
        return chain
      },
      limit() {
        return chain
      },
      single() {
        wantSingle = true
        return chain
      },
      maybeSingle() {
        wantSingle = true
        return chain
      },
      then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        const result = execute(filters, op, wantSingle, orderDesc)
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return {
    from: () => makeChain(),
    _state: state,
    _latest(profileId: string) {
      const matched = state.reports.filter((r) => r.profile_id === profileId)
      if (matched.length === 0) return null
      return matched.reduce((a, b) => (Number(b.version) > Number(a.version) ? b : a))
    },
  }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { getLatestSavedProfileReport } from '@/lib/circle/service'
import { POST } from '@/app/api/circle/profiles/[profileId]/report/route'

function makeRequest() {
  return new Request('http://localhost/api/circle/profiles/profile_1/report', {
    method: 'POST',
    body: JSON.stringify({ relationshipType: 'romantic' }),
  })
}

function makeContext() {
  return { params: Promise.resolve({ profileId: 'profile_1' }) }
}

let fake: ReturnType<typeof createFakeSupabase>

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
  vi.mocked(getLatestSavedProfileReport).mockImplementation(async (profileId: string) => fake._latest(profileId) as never)
})

describe('POST /api/circle/profiles/[profileId]/report — concurrent-generation race', () => {
  it('leaves exactly one report row after two concurrent generations, and the loser gets the winner\'s report, not a 500 or a duplicate', async () => {
    const [resA, resB] = await Promise.all([
      POST(makeRequest(), makeContext()),
      POST(makeRequest(), makeContext()),
    ])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)
    expect(fake._state.reports).toHaveLength(1)
    expect(fake._state.reports[0].version).toBe(1)
    expect(jsonA.id).toBe(jsonB.id)
  })
})
