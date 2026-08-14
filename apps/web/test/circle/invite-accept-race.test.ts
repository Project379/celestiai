import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Regression test for the invite-accept race condition found during the
 * Batch 4 Кръг mobile-port investigation (2026-08-14): the original route
 * fetched the invite with a plain SELECT (status = 'pending' AND
 * expires_at > now), did all the expensive work (create a space, insert
 * members, generate a report), and only marked the invite 'accepted' in
 * its LAST write. Two concurrent POSTs with the same still-valid token
 * could both pass the SELECT before either commit landed, producing two
 * separate connection_spaces from one invite token.
 *
 * The fix replaces the SELECT-then-UPDATE with a single conditional
 * UPDATE ... WHERE status = 'pending' AND expires_at > now() RETURNING.
 * This test proves the property that check actually buys: of two
 * concurrent accepts against the same token, exactly one succeeds and the
 * other gets the same 404 a stale/unknown token would. A test that only
 * exercised SEQUENTIAL reuse (accept, then accept again) would pass
 * against the broken code too — the bug was specifically about two
 * requests racing before either write commits, not about reuse after
 * completion.
 *
 * The fake Supabase client below is deliberately NOT the shared FIFO
 * queue mock (test/mocks/supabase.ts) — that mock replays pre-scripted
 * results per call and can't model "the second concurrent UPDATE sees
 * the row the first one already flipped," which is the exact property
 * under test. This fake tracks real row state and applies each
 * update/insert synchronously at the moment its chain is awaited —
 * mirroring how a single Postgres UPDATE statement is atomic. Because
 * JS is single-threaded, two synchronous state mutations from "concurrent"
 * awaits can never interleave with each other, so whichever request's
 * claim-update chain resolves first genuinely wins the row, the same way
 * Postgres would serialize the two real UPDATE statements.
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
}))

vi.mock('@/lib/circle/service', () => ({
  getLatestChartRowForUser: vi.fn(async (userId: string) => ({ id: `chart_${userId}`, name: `Chart ${userId}` })),
  getChartById: vi.fn(async (chartId: string) => ({ id: chartId, name: chartId })),
  hasActiveRomanticSpace: vi.fn(async () => false),
  getSpaceById: vi.fn(async () => null),
  // Empty is fine — buildSpaceComputation (below) is mocked and doesn't
  // read its member-chart input. Not under test here: the compatibility
  // calculation itself, only whether exactly one space gets created.
  listSpaceMembers: vi.fn(async () => []),
  buildSpaceComputation: vi.fn(async () => ({
    compatibilitySummary: { headline_score: 50 },
    synastryAspects: [],
    compositeChartData: {},
  })),
}))

const TOKEN = 'race-test-token-1234567890'
const INVITER_ID = 'user_inviter'

// Real hashInviteToken (pure SHA-256, no DB) — not mocked, so the fixture
// row's token_hash is computed the same way the route computes it.
import { hashInviteToken } from '@/lib/circle/token'

type InviteRow = {
  id: string
  token_hash: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  expires_at: string
  space_id: string | null
  invite_label: string | null
  relationship_type: 'romantic' | 'friendship' | 'work' | 'family'
  inviter_user_id: string
  inviter_chart_id: string
  accepted_by_user_id: string | null
  accepted_at: string | null
}

type Filter = { col: string; op: 'eq' | 'gt'; val: unknown }

function matches(row: Record<string, unknown>, filters: Filter[]) {
  return filters.every((f) => {
    const rowVal = row[f.col]
    if (f.op === 'eq') return rowVal === f.val
    // 'gt' is only ever used here on expires_at (ISO date strings) —
    // string comparison is correct for ISO-8601.
    return typeof rowVal === 'string' && typeof f.val === 'string' && rowVal > f.val
  })
}

/**
 * Minimal WHERE-aware, state-tracking fake — see the file header comment
 * for why the shared FIFO mock can't be used for this test.
 */
function createRaceAwareSupabase(fixtureInvite: InviteRow) {
  const state = {
    invites: [fixtureInvite] as InviteRow[],
    spaces: [] as Array<{ id: string; [k: string]: unknown }>,
    members: [] as Array<Record<string, unknown>>,
    reports: [] as Array<Record<string, unknown>>,
  }
  let spaceCounter = 0

  function table(name: string): Array<Record<string, unknown>> {
    if (name === 'connection_invites') return state.invites
    if (name === 'connection_spaces') return state.spaces
    if (name === 'connection_members') return state.members
    if (name === 'connection_reports') return state.reports
    throw new Error(`race-aware fake: unhandled table "${name}"`)
  }

  function execute(
    tableName: string,
    filters: Filter[],
    op: { type: 'update'; patch: Record<string, unknown> } | { type: 'insert'; rows: Record<string, unknown>[] } | { type: 'select' } | null,
    wantSingle: boolean,
  ) {
    const rows = table(tableName)

    if (op?.type === 'insert') {
      const inserted = op.rows.map((r) => {
        const row = { ...r }
        if (tableName === 'connection_spaces' && !row.id) row.id = `space_${++spaceCounter}`
        return row
      })
      rows.push(...inserted)
      return { data: wantSingle ? inserted[0] : inserted, error: null }
    }

    if (op?.type === 'update') {
      // The atomic step: find + conditionally mutate happens in this one
      // synchronous call. Whichever concurrent request's chain reaches
      // `.then()` first runs this line first and wins.
      const match = rows.find((r) => matches(r, filters))
      if (!match) return { data: null, error: null }
      Object.assign(match, op.patch)
      return { data: { ...match }, error: null }
    }

    // select / no explicit op
    const matched = rows.filter((r) => matches(r, filters))
    if (wantSingle) return { data: matched[0] ?? null, error: null }
    return { data: matched, error: null }
  }

  function makeChain(tableName: string) {
    const filters: Filter[] = []
    let op: { type: 'update'; patch: Record<string, unknown> } | { type: 'insert'; rows: Record<string, unknown>[] } | { type: 'select' } | null = null
    let wantSingle = false

    const chain = {
      eq(col: string, val: unknown) {
        filters.push({ col, op: 'eq', val })
        return chain
      },
      gt(col: string, val: unknown) {
        filters.push({ col, op: 'gt', val })
        return chain
      },
      update(patch: Record<string, unknown>) {
        op = { type: 'update', patch }
        return chain
      },
      insert(rows: Record<string, unknown> | Record<string, unknown>[]) {
        op = { type: 'insert', rows: Array.isArray(rows) ? rows : [rows] }
        return chain
      },
      select() {
        if (!op) op = { type: 'select' }
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
      order() {
        return chain
      },
      limit() {
        return chain
      },
      then(onFulfilled?: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
        const result = execute(tableName, filters, op, wantSingle)
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
import { POST } from '@/app/api/circle/invites/accept/route'

function makeRequest() {
  return new Request('http://localhost/api/circle/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token: TOKEN }),
  })
}

let fake: ReturnType<typeof createRaceAwareSupabase>

beforeEach(() => {
  vi.clearAllMocks()
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const fixtureInvite: InviteRow = {
    id: 'invite_1',
    token_hash: hashInviteToken(TOKEN),
    status: 'pending',
    expires_at: future,
    space_id: null,
    invite_label: null,
    relationship_type: 'romantic',
    inviter_user_id: INVITER_ID,
    inviter_chart_id: 'chart_inviter',
    accepted_by_user_id: null,
    accepted_at: null,
  }
  fake = createRaceAwareSupabase(fixtureInvite)
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
})

describe('POST /api/circle/invites/accept — concurrent-accept race', () => {
  it('lets exactly one of two concurrent accepts win; the loser gets the same 404 a stale token would', async () => {
    vi.mocked(auth)
      .mockResolvedValueOnce({ userId: 'user_alice' } as never)
      .mockResolvedValueOnce({ userId: 'user_bob' } as never)

    const [resA, resB] = await Promise.all([POST(makeRequest()), POST(makeRequest())])
    const [jsonA, jsonB] = await Promise.all([resA.json(), resB.json()])

    const results = [
      { status: resA.status, json: jsonA },
      { status: resB.status, json: jsonB },
    ]

    const winners = results.filter((r) => r.status === 200)
    const losers = results.filter((r) => r.status !== 200)

    expect(winners).toHaveLength(1)
    expect(losers).toHaveLength(1)

    // The loser is indistinguishable from a stale/unknown token — same
    // status, same message, no signal that it was "close."
    expect(losers[0].status).toBe(404)
    expect(losers[0].json).toEqual({ error: 'Поканата е изтекла или не е валидна.' })

    // Exactly one connection_spaces row exists — not two.
    expect(fake._state.spaces).toHaveLength(1)

    // The invite ends up accepted by whichever request actually won —
    // not left in a half-claimed state.
    expect(fake._state.invites[0].status).toBe('accepted')
    expect(['user_alice', 'user_bob']).toContain(fake._state.invites[0].accepted_by_user_id)
  })

  it('sequential accept after a completed accept still gets the standard 404 (unchanged behavior)', async () => {
    vi.mocked(auth)
      .mockResolvedValueOnce({ userId: 'user_alice' } as never)
      .mockResolvedValueOnce({ userId: 'user_bob' } as never)

    const first = await POST(makeRequest())
    expect(first.status).toBe(200)

    const second = await POST(makeRequest())
    expect(second.status).toBe(404)
    expect(await second.json()).toEqual({ error: 'Поканата е изтекла или не е валидна.' })
    expect(fake._state.spaces).toHaveLength(1)
  })
})
