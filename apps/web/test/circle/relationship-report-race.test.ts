import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression test for the connection-report version race found in the
 * same Batch 4 sub-batch B check-then-act sweep that found the
 * invite-accept bug (2026-08-14): the route read the latest report
 * version, ran the (slow) ephemeris + report-content computation, then
 * inserted a new report with `latest + 1` — no exclusivity between the
 * read and the insert, and no UNIQUE(space_id, version) constraint to
 * catch a collision at the database level either. Two concurrent
 * generations could both read the same "latest version" and both insert
 * a row with the same version number.
 *
 * The durable fix (a UNIQUE(space_id, version) constraint, matching the
 * founder's ruling — "the natural form is a UNIQUE constraint... plus
 * handling the conflict cleanly") needs a migration and is halted for
 * ratification (see COMPLETION-TRACKER.md). This is the interim fix:
 * re-read the latest version immediately before inserting, and if
 * another request's report landed in the meantime, return THAT report
 * instead of inserting a duplicate. This test proves the property that
 * buys: of two concurrent generations, exactly one report row exists
 * afterward, and the loser's response is the SAME report data as the
 * winner's — not a 500, not a silent duplicate.
 *
 * Same fake-Supabase approach as invite-accept-race.test.ts (see that
 * file's header for why the shared FIFO mock can't model this) — a
 * minimal WHERE-aware, state-tracking fake local to this test.
 */

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/rate-limit', () => ({
  assertRateLimit: vi.fn(async () => undefined),
}))

vi.mock('@/lib/audit', () => ({
  logAuditEvent: vi.fn(),
}))

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
  buildSpaceComputation: vi.fn(async () => ({
    compatibilitySummary: { headline_score: 70 },
    synastryAspects: [],
    compositeChartData: {},
  })),
}))

type Filter = { col: string; op: 'eq' | 'gt'; val: unknown }

function matches(row: Record<string, unknown>, filters: Filter[]) {
  return filters.every((f) => {
    const rowVal = row[f.col]
    if (f.op === 'eq') return rowVal === f.val
    return typeof rowVal === 'string' && typeof f.val === 'string' && rowVal > f.val
  })
}

/**
 * WHERE-aware, state-tracking fake — tracks connection_reports and
 * connection_spaces as real in-memory tables so a SELECT genuinely
 * reflects whatever the other "concurrent" request already inserted, the
 * same property the shared FIFO mock can't provide.
 */
function createFakeSupabase() {
  const state = {
    reports: [] as Array<Record<string, unknown>>,
    spaces: [] as Array<Record<string, unknown>>,
  }
  let idCounter = 0

  function table(name: string) {
    if (name === 'connection_reports') return state.reports
    if (name === 'connection_spaces') return state.spaces
    throw new Error(`fake: unhandled table "${name}"`)
  }

  function execute(
    tableName: string,
    filters: Filter[],
    op: { type: 'insert'; rows: Record<string, unknown>[] } | { type: 'update'; patch: Record<string, unknown> } | null,
    wantSingle: boolean,
    orderDesc: string | null,
  ) {
    const rows = table(tableName)

    if (op?.type === 'insert') {
      // Models connection_reports_unique_version — UNIQUE(space_id,
      // version), live in the real schema since the original migration
      // (see the file header) — the property under test. Without this,
      // the fake wouldn't reproduce the actual database's rejection of a
      // colliding version and the test would prove nothing.
      if (tableName === 'connection_reports') {
        for (const candidate of op.rows) {
          const conflict = rows.find(
            (r) => r.space_id === candidate.space_id && r.version === candidate.version,
          )
          if (conflict) {
            return {
              data: null,
              error: { code: '23505', message: 'duplicate key value violates unique constraint "connection_reports_unique_version"' },
            }
          }
        }
      }
      const inserted = op.rows.map((r) => ({ id: `row_${++idCounter}`, ...r }))
      rows.push(...inserted)
      return { data: wantSingle ? inserted[0] : inserted, error: null }
    }

    if (op?.type === 'update') {
      const match = rows.find((r) => matches(r, filters))
      if (match) Object.assign(match, op.patch)
      return { data: null, error: null }
    }

    let matched = rows.filter((r) => matches(r, filters))
    if (orderDesc) {
      matched = [...matched].sort((a, b) => (Number(b[orderDesc]) || 0) - (Number(a[orderDesc]) || 0))
    }
    if (wantSingle) return { data: matched[0] ?? null, error: null }
    return { data: matched, error: null }
  }

  function makeChain(tableName: string) {
    const filters: Filter[] = []
    let op: { type: 'insert'; rows: Record<string, unknown>[] } | { type: 'update'; patch: Record<string, unknown> } | null = null
    let wantSingle = false
    let orderDesc: string | null = null

    const chain = {
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val })
        return chain
      },
      gt(col: string, val: unknown) {
        filters.push({ col, op: 'gt', val })
        return chain
      },
      insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
        op = { type: 'insert', rows: Array.isArray(rows) ? rows : [rows] }
        return chain
      },
      update(patch: Record<string, unknown>) {
        op = { type: 'update', patch }
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
        const result = execute(tableName, filters, op, wantSingle, orderDesc)
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { from: (t: string) => makeChain(t), _state: state }
}

vi.mock('@/lib/supabase/service', () => ({
  createServiceSupabaseClient: vi.fn(),
}))

import { auth } from '@clerk/nextjs/server'
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

let fake: ReturnType<typeof createFakeSupabase>

beforeEach(() => {
  vi.clearAllMocks()
  fake = createFakeSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
})

describe('POST /api/circle/relationships/[relationshipId]/report — concurrent-generation race', () => {
  it('leaves exactly one report row after two concurrent generations, and the loser gets the winner\'s report, not a 500 or a duplicate', async () => {
    vi.mocked(auth)
      .mockResolvedValueOnce({ userId: 'user_a' } as never)
      .mockResolvedValueOnce({ userId: 'user_b' } as never)

    const [resA, resB] = await Promise.all([
      POST(makeRequest(), makeContext()),
      POST(makeRequest(), makeContext()),
    ])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)

    // Exactly one report row exists — not two with the same version.
    expect(fake._state.reports).toHaveLength(1)
    expect(fake._state.reports[0].version).toBe(1)

    // Both responses describe the SAME report (the loser was handed the
    // winner's row, not a duplicate insert of its own).
    expect(jsonA.id).toBe(jsonB.id)
    expect(jsonA.version).toBe(1)
    expect(jsonB.version).toBe(1)
  })

  it('a third generation after the first completes gets version 2, not another collision', async () => {
    vi.mocked(auth).mockResolvedValueOnce({ userId: 'user_a' } as never)
    const first = await POST(makeRequest(), makeContext())
    expect((await first.json()).version).toBe(1)

    vi.mocked(auth).mockResolvedValueOnce({ userId: 'user_b' } as never)
    const second = await POST(makeRequest(), makeContext())
    expect((await second.json()).version).toBe(2)

    expect(fake._state.reports).toHaveLength(2)
  })
})
