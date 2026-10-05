import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Saved-profile report auto-refresh after a birth-data edit (Batch 8 "b").
 *
 * A saved-profile report is deterministic synastry against the user's ACTIVE
 * chart (no AI, no quota). When the active chart's birth_data_edited_at is
 * newer than the latest report, the report is recomputed on next view as
 * version+1 — not hidden until the user clicks "analyze". The 50-version cap is
 * ignored for this automatic path (founder ruling). It never auto-creates a
 * first report, and a stale report is NEVER returned.
 */

vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))
vi.mock('@/lib/circle/weather', () => ({ buildRelationshipWeatherOverview: vi.fn(() => null) }))
vi.mock('@/lib/circle/report', () => ({
  buildSavedProfileFullContent: vi.fn(() => ({ full: true })),
  buildSavedProfileTeaserContent: vi.fn(() => ({ full: false })),
  MAX_REPORT_VERSIONS_PER_PAIR: 50,
}))

const calc = vi.hoisted(() => ({
  summary: { headline_score: 77, domains: {} },
  fail: false,
}))
vi.mock('@stellaeum/astrology', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@stellaeum/astrology')>()),
  calculateNatalChart: vi.fn(() => ({ planets: [], houses: [], aspects: [], ascendant: 0, mc: 0, birthTimeKnown: true })),
}))
vi.mock('@stellaeum/core', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@stellaeum/core')>()),
  calculateCompatibilitySummary: vi.fn(() => {
    if (calc.fail) throw new Error('boom')
    return calc.summary
  }),
  calculateCrossChartAspects: vi.fn(() => []),
}))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { getFreshSavedProfileReport } from '@/lib/circle/service'

let mockSupabase: MockSupabase

const MARKER = '2026-09-10T00:00:00.000Z'
const PROFILE = {
  id: 'p1', user_id: 'user-1', name: 'Мария', birth_date: '1995-05-05', birth_time: '10:00',
  birth_time_known: true, approximate_time_range: null, latitude: 42.7, longitude: 23.3,
} as never
const report = (createdAt: string, version = 1, extra: Record<string, unknown> = {}) => ({
  id: `r${version}`, profile_id: 'p1', user_id: 'user-1', version, relationship_type: 'friendship',
  created_at: createdAt, ...extra,
})

function seed(opts: {
  latest: Record<string, unknown> | null
  chart?: Record<string, unknown> | null
  tier?: 'free' | 'premium'
  insert?: { data?: unknown; error?: unknown }
}) {
  mockSupabase.push('saved_people_reports', { data: opts.latest })
  mockSupabase.push('charts', {
    data: opts.chart === undefined
      ? { id: 'c1', user_id: 'user-1', birth_date: '1990-01-01', birth_time: '08:00', birth_time_known: true,
          approximate_time_range: null, latitude: 42.7, longitude: 23.3, birth_data_edited_at: MARKER }
      : opts.chart,
  })
  mockSupabase.push('users', { data: { subscription_tier: opts.tier ?? 'free' } })
  mockSupabase.push('chart_calculations', {
    data: { planet_positions: [], house_cusps: [], aspects: [], ascendant: 0, mc: 0, birth_time_known: true },
  })
  if (opts.insert) mockSupabase.push('saved_people_reports', opts.insert)
}

const insertBuilder = () => {
  const calls = mockSupabase.from.mock.calls
  const results = mockSupabase.from.mock.results
  const idx = calls.map((c, i) => [c[0], i] as const).filter(([t]) => t === 'saved_people_reports')[1]?.[1]
  return idx === undefined ? undefined : results[idx].value
}

beforeEach(() => {
  vi.clearAllMocks()
  calc.fail = false
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('getFreshSavedProfileReport', () => {
  it('returns a fresh report untouched — no recompute, no insert', async () => {
    const fresh = report('2026-09-11T00:00:00.000Z')
    seed({ latest: fresh })

    expect(await getFreshSavedProfileReport(PROFILE, 'user-1')).toMatchObject({ id: 'r1' })
    expect(insertBuilder()).toBeUndefined()
  })

  it('recomputes a STALE report on view: inserts version+1 with the same relationship type, the owner, and the new score', async () => {
    const created = report('2026-09-12T00:00:00.000Z', 2, { relationship_type: 'friendship' })
    seed({
      latest: report('2026-09-01T00:00:00.000Z', 1, { relationship_type: 'friendship' }),
      insert: { data: created },
    })

    const result = await getFreshSavedProfileReport(PROFILE, 'user-1')

    expect(result).toMatchObject({ id: 'r2', version: 2 })
    const insert = insertBuilder().insert.mock.calls[0][0]
    expect(insert).toMatchObject({
      profile_id: 'p1', user_id: 'user-1', version: 2, relationship_type: 'friendship', headline_score: 77,
    })
  })

  it('premium gets the full report content, free gets the teaser (same tiering as the analyze action)', async () => {
    seed({ latest: report('2026-09-01T00:00:00.000Z'), tier: 'premium', insert: { data: report('2026-09-12T00:00:00.000Z', 2) } })
    await getFreshSavedProfileReport(PROFILE, 'user-1')
    expect(insertBuilder().insert.mock.calls[0][0]).toMatchObject({ is_full: true, report_content: { full: true } })

    mockSupabase = createMockSupabase()
    vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
    seed({ latest: report('2026-09-01T00:00:00.000Z'), tier: 'free', insert: { data: report('2026-09-12T00:00:00.000Z', 2) } })
    await getFreshSavedProfileReport(PROFILE, 'user-1')
    expect(insertBuilder().insert.mock.calls[0][0]).toMatchObject({ is_full: false, report_content: { full: false } })
  })

  it('ignores the 50-version cap on the automatic path (baseline at the cap still recomputes as v51)', async () => {
    seed({
      latest: report('2026-09-01T00:00:00.000Z', 50),
      insert: { data: report('2026-09-12T00:00:00.000Z', 51) },
    })

    const result = await getFreshSavedProfileReport(PROFILE, 'user-1')

    expect(result).toMatchObject({ version: 51 })
    expect(insertBuilder().insert.mock.calls[0][0]).toMatchObject({ version: 51 })
  })

  it('never auto-creates a FIRST report — no report means null and no insert', async () => {
    seed({ latest: null })

    expect(await getFreshSavedProfileReport(PROFILE, 'user-1')).toBeNull()
    expect(insertBuilder()).toBeUndefined()
  })

  it('a concurrent view that already inserted version+1 (23505) returns that winner, not an error', async () => {
    const winner = report('2026-09-12T00:00:00.000Z', 2)
    seed({
      latest: report('2026-09-01T00:00:00.000Z', 1),
      insert: { data: null, error: { code: '23505', message: 'duplicate' } },
    })
    mockSupabase.push('saved_people_reports', { data: winner }) // winner re-read

    expect(await getFreshSavedProfileReport(PROFILE, 'user-1')).toMatchObject({ id: 'r2' })
  })

  it('a recompute failure returns null (hidden) — a stale report is never served, and nothing throws', async () => {
    calc.fail = true
    seed({ latest: report('2026-09-01T00:00:00.000Z') })

    expect(await getFreshSavedProfileReport(PROFILE, 'user-1')).toBeNull()
  })

  it('a user with no chart has nothing to be stale against — the existing report is returned', async () => {
    seed({ latest: report('2026-09-01T00:00:00.000Z'), chart: null })

    expect(await getFreshSavedProfileReport(PROFILE, 'user-1')).toMatchObject({ id: 'r1' })
  })
})
