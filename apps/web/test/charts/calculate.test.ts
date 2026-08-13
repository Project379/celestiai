import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests calculateChartForUser (packages/core/src/charts/calculate.ts) — the
 * cache-or-compute logic behind /api/chart/calculate, the route flagged as
 * the most expensive unrate-limited surface before Batch 1. Mocks
 * @supabase/supabase-js's createClient directly (rather than
 * createCoreSupabaseClient, which packages/core resolves via a relative
 * import Vitest can't intercept from apps/web) so the mock plumbing is
 * robust to how the core package is internally structured.
 *
 * Tests the actual branching the code performs, not the intended shape of
 * a "cache-or-compute" system in general.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

const { calculateNatalChart } = vi.hoisted(() => ({
  calculateNatalChart: vi.fn(),
}))

vi.mock('@stellaeum/astrology', () => ({
  calculateNatalChart,
}))

import { calculateChartForUser } from '@stellaeum/core/charts/calculate'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

const CHART_ROW = {
  id: 'chart-1',
  user_id: 'user-1',
  birth_date: '1990-01-01T00:00:00.000Z',
  birth_time: '12:00',
  latitude: 42.7,
  longitude: 23.3,
  birth_time_known: true,
}

const CACHED_ROW = {
  planet_positions: [{ planet: 'sun', longitude: 100 }],
  house_cusps: [{ number: 1, cuspLongitude: 0 }],
  aspects: [],
  ascendant: { longitude: 10 },
  mc: { longitude: 280 },
  birth_time_known: true,
}

describe('calculateChartForUser', () => {
  it('returns CHART_NOT_FOUND when the chart row does not exist', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'no rows' } })

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'CHART_NOT_FOUND' })
  })

  it('returns FORBIDDEN when the chart belongs to a different user — does not leak chart existence via a different error', async () => {
    mockSupabase.push('charts', { data: { ...CHART_ROW, user_id: 'someone-else' } })

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'FORBIDDEN' })
  })

  it('returns the cached calculation and cached:true on a cache hit, without invoking calculateNatalChart', async () => {
    mockSupabase.push('charts', { data: CHART_ROW })
    mockSupabase.push('chart_calculations', { data: CACHED_ROW })

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cached).toBe(true)
      expect(result.data.planets).toEqual(CACHED_ROW.planet_positions)
    }
    expect(calculateNatalChart).not.toHaveBeenCalled()
  })

  it('computes fresh, writes the cache, and returns cached:false on a cache miss', async () => {
    mockSupabase.push('charts', { data: CHART_ROW })
    mockSupabase.push('chart_calculations', { data: null }) // cache miss
    mockSupabase.push('chart_calculations', { data: null, error: null }) // insert result

    const freshChart = {
      planets: [{ planet: 'moon', longitude: 200 }],
      houses: [{ number: 1, cuspLongitude: 5 }],
      aspects: [],
      ascendant: { longitude: 15 },
      mc: { longitude: 285 },
      birthTimeKnown: true,
    }
    vi.mocked(calculateNatalChart).mockReturnValue(freshChart as never)

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: true, data: freshChart, cached: false })
    expect(calculateNatalChart).toHaveBeenCalledWith({
      date: new Date(CHART_ROW.birth_date),
      time: CHART_ROW.birth_time,
      lat: CHART_ROW.latitude,
      lon: CHART_ROW.longitude,
      birthTimeKnown: CHART_ROW.birth_time_known,
    })
  })

  it('returns CALC_ERROR (not a thrown exception) when calculateNatalChart throws — the route depends on this to map to a clean 500', async () => {
    mockSupabase.push('charts', { data: CHART_ROW })
    mockSupabase.push('chart_calculations', { data: null })
    vi.mocked(calculateNatalChart).mockImplementation(() => {
      throw new Error('ephemeris out of range')
    })

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'CALC_ERROR' })
  })

  it('still returns the fresh calculation to the caller even when the cache-write insert fails (a cache-write failure must not fail the request — it only means next call recomputes)', async () => {
    mockSupabase.push('charts', { data: CHART_ROW })
    mockSupabase.push('chart_calculations', { data: null })
    mockSupabase.push('chart_calculations', { data: null, error: { message: 'insert failed' } })

    const freshChart = {
      planets: [],
      houses: [],
      aspects: [],
      ascendant: { longitude: 0 },
      mc: { longitude: 0 },
      birthTimeKnown: true,
    }
    vi.mocked(calculateNatalChart).mockReturnValue(freshChart as never)

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: true, data: freshChart, cached: false })
  })

  it('returns INTERNAL when the initial chart lookup itself throws (not a Supabase {error} result, an actual exception)', async () => {
    mockSupabase.from.mockImplementationOnce(() => {
      throw new Error('connection refused')
    })

    const result = await calculateChartForUser('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'INTERNAL' })
  })
})
