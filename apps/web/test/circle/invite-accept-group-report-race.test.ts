import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Batch 5.5 finding #2: the invite-accept route's existing-space (group)
 * branch had the SAME unhandled-insert-error bug Batch 4 already fixed in
 * the two standalone report routes (commit 7d60778) — missed at this
 * third call site. Two DIFFERENT invite tokens into the SAME existing
 * group space, accepted concurrently by two different invitees: both
 * requests independently claim their own token via the atomic UPDATE
 * (already safe — not what's under test here), both successfully add
 * their own connection_members row, but both read the same
 * pre-write "latest report version" and both attempt to insert a report
 * at that same version. The DB's real UNIQUE(space_id, version)
 * constraint (connection_reports_unique_version) rejects the loser's
 * insert with 23505 — pre-fix, that error was never checked, so the
 * route still returned 200 {spaceId} to the loser even though no report
 * exists reflecting their membership.
 *
 * Same fake-Supabase approach as invite-accept-race.test.ts and
 * relationship-report-race.test.ts — a minimal WHERE-aware,
 * state-tracking fake that actually models the real UNIQUE constraint at
 * insert time, so the test proves the DB-level property rather than
 * depending on precise async interleaving.
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
  getLatestChartRowForUser: vi.fn(async (userId: string) => ({
    id: `chart_${userId}`,
    name: `Chart ${userId}`,
  })),
  getChartById: vi.fn(async (chartId: string) => ({ id: chartId, name: chartId })),
  hasActiveRomanticSpace: vi.fn(async () => false),
  // Existing, active, non-romantic group space — both invites target it.
  getSpaceById: vi.fn(async () => ({
    id: 'space_1',
    label: 'Group Space',
    status: 'active',
    relationship_type: 'friendship',
  })),
  // Neither test invitee is already a member — fixed pre-existing owner
  // only. Doesn't need to reflect real inserted rows for this test.
  listSpaceMembers: vi.fn(async () => [
    { user_id: 'user_existing_owner', chart_id: 'chart_owner' },
  ]),
  buildSpaceComputation: vi.fn(async () => ({
    compatibilitySummary: { headline_score: 60 },
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

/**
 * WHERE-aware, state-tracking fake covering the four tables this branch
 * touches. connection_reports insert models the real
 * connection_reports_unique_version constraint, the property under test.
 */
function createFakeSupabase(invites: InviteRow[], opts: { forceReportInsertError?: boolean } = {}) {
  const state = {
    invites,
    members: [] as Array<Record<string, unknown>>,
    spaces: [{ id: 'space_1' }] as Array<Record<string, unknown>>,
    reports: [] as Array<Record<string, unknown>>,
  }

  function table(name: string): Array<Record<string, unknown>> {
    if (name === 'connection_invites') return state.invites
    if (name === 'connection_members') return state.members
    if (name === 'connection_spaces') return state.spaces
    if (name === 'connection_reports') return state.reports
    throw new Error(`fake: unhandled table "${name}"`)
  }

  function execute(
    tableName: string,
    filters: Filter[],
    op:
      | { type: 'update'; patch: Record<string, unknown> }
      | { type: 'insert'; rows: Record<string, unknown>[] }
      | null,
    wantSingle: boolean,
    orderDesc: string | null,
  ) {
    const rows = table(tableName)

    if (op?.type === 'insert') {
      if (tableName === 'connection_reports') {
        // Injects a GENERIC (non-23505) insert failure — e.g. a transient
        // connection error, unrelated to the version-collision case. This
        // is the actual pre/post-fix discriminator: a version collision
        // (23505) produces the same final DB state either way (the
        // constraint enforces it regardless of whether the app code
        // checks the error), but a genuine non-23505 failure does NOT —
        // pre-fix, it was never checked at all, so the route still
        // returned 200 with no report ever created for this accept.
        if (opts.forceReportInsertError) {
          return {
            data: null,
            error: { code: 'OTHER', message: 'connection reset' },
          }
        }
        for (const candidate of op.rows) {
          const conflict = rows.find(
            (r) => r.space_id === candidate.space_id && r.version === candidate.version,
          )
          if (conflict) {
            return {
              data: null,
              error: {
                code: '23505',
                message:
                  'duplicate key value violates unique constraint "connection_reports_unique_version"',
              },
            }
          }
        }
      }
      const inserted = op.rows.map((r, i) => ({ id: `${tableName}_row_${rows.length + i}`, ...r }))
      rows.push(...inserted)
      return { data: wantSingle ? inserted[0] : inserted, error: null }
    }

    if (op?.type === 'update') {
      // Atomic claim step (connection_invites) and cache-refresh
      // (connection_spaces) both go through here. Whichever concurrent
      // request's chain reaches `.then()` first runs this synchronous
      // mutation first — matches how a real UPDATE statement serializes.
      const match = rows.find((r) => matches(r, filters))
      if (!match) return { data: null, error: null }
      Object.assign(match, op.patch)
      return { data: { ...match }, error: null }
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
    let op:
      | { type: 'update'; patch: Record<string, unknown> }
      | { type: 'insert'; rows: Record<string, unknown>[] }
      | null = null
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
      update(patch: Record<string, unknown>) {
        op = { type: 'update', patch }
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

import { hashInviteToken } from '@/lib/circle/token'
import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/circle/invites/accept/route'

const TOKEN_A = 'group-race-token-alice-000000'
const TOKEN_B = 'group-race-token-bob-0000000'

function makeRequest(token: string) {
  return new Request('http://localhost/api/circle/invites/accept', {
    method: 'POST',
    body: JSON.stringify({ token }),
  })
}

let fake: ReturnType<typeof createFakeSupabase>

beforeEach(() => {
  vi.clearAllMocks()
  const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const invites: InviteRow[] = [
    {
      id: 'invite_alice',
      token_hash: hashInviteToken(TOKEN_A),
      status: 'pending',
      expires_at: future,
      space_id: 'space_1',
      invite_label: null,
      relationship_type: 'friendship',
      inviter_user_id: 'user_existing_owner',
      inviter_chart_id: 'chart_owner',
      accepted_by_user_id: null,
      accepted_at: null,
    },
    {
      id: 'invite_bob',
      token_hash: hashInviteToken(TOKEN_B),
      status: 'pending',
      expires_at: future,
      space_id: 'space_1',
      invite_label: null,
      relationship_type: 'friendship',
      inviter_user_id: 'user_existing_owner',
      inviter_chart_id: 'chart_owner',
      accepted_by_user_id: null,
      accepted_at: null,
    },
  ]
  fake = createFakeSupabase(invites)
  vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
})

describe('POST /api/circle/invites/accept — group-space report-version race (Batch 5.5 #2)', () => {
  it('both concurrent accepts into the same group space succeed with a member added, and no report insert error is silently swallowed as a false success', async () => {
    vi.mocked(auth)
      .mockResolvedValueOnce({ userId: 'user_alice' } as never)
      .mockResolvedValueOnce({ userId: 'user_bob' } as never)

    const [resA, resB] = await Promise.all([
      POST(makeRequest(TOKEN_A)),
      POST(makeRequest(TOKEN_B)),
    ])

    // Pre-fix, a version collision on the loser's report insert was never
    // checked — this route always returned 200 regardless. Post-fix, a
    // 23505 on this insert is treated as "someone else's concurrent
    // accept already produced a report for this space" and still returns
    // 200 (the member WAS added), but any OTHER insert error would now
    // surface as a real failure via AcceptRejected instead of a silent
    // false success. This assertion documents the currently-correct
    // outcome for the 23505 case specifically.
    expect(resA.status).toBe(200)
    expect(resB.status).toBe(200)

    // Both invitees were actually added as members — the real,
    // already-committed side effect that must never be undone by a
    // report-version collision.
    const memberUserIds = fake._state.members.map((m) => m.user_id)
    expect(memberUserIds).toContain('user_alice')
    expect(memberUserIds).toContain('user_bob')

    // Exactly ONE report exists for this space+version pair — the DB
    // constraint did its job, and the loser's insert was correctly
    // recognized as a collision rather than either double-inserting or
    // silently producing zero reports.
    const reportsForSpace = fake._state.reports.filter((r) => r.space_id === 'space_1')
    expect(reportsForSpace).toHaveLength(1)

    // Both invites ended up accepted — the report-version race is
    // orthogonal to the (already-safe) per-token claim.
    expect(fake._state.invites.every((inv) => inv.status === 'accepted')).toBe(true)
  })

  it('surfaces a genuine (non-23505) report insert failure as a real error, instead of silently returning 200 with no report created — the actual pre/post-fix discriminator', async () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const invite: InviteRow = {
      id: 'invite_solo',
      token_hash: hashInviteToken(TOKEN_A),
      status: 'pending',
      expires_at: future,
      space_id: 'space_1',
      invite_label: null,
      relationship_type: 'friendship',
      inviter_user_id: 'user_existing_owner',
      inviter_chart_id: 'chart_owner',
      accepted_by_user_id: null,
      accepted_at: null,
    }
    fake = createFakeSupabase([invite], { forceReportInsertError: true })
    vi.mocked(createServiceSupabaseClient).mockReturnValue(fake as never)
    vi.mocked(auth).mockResolvedValueOnce({ userId: 'user_alice' } as never)

    const res = await POST(makeRequest(TOKEN_A))

    // Pre-fix: the insert error was never checked, so this returned 200
    // {spaceId} even though no report row exists. Post-fix: a non-23505
    // error throws AcceptRejected(500), which also releases the claim.
    expect(res.status).toBe(500)

    // The member WAS added (that write already committed and is real —
    // best-effort release doesn't and shouldn't undo it, same documented
    // tradeoff as every other post-claim failure in this route).
    expect(fake._state.members.map((m) => m.user_id)).toContain('user_alice')

    // No report was created for this failed accept.
    expect(fake._state.reports).toHaveLength(0)

    // The claim was released back to 'pending' so the token remains
    // usable — the existing best-effort releaseClaim behavior, unchanged
    // by this fix, now actually reachable for this specific failure path.
    expect(fake._state.invites[0].status).toBe('pending')
  })
})
