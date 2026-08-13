import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests packages/core/src/charts/birth-data.ts — the CRUD functions behind
 * the birth-data routes rate-limited in Batch 1. Same createClient-mocking
 * approach as calculate.test.ts.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import {
  createBirthChart,
  deleteBirthChart,
  getBirthChart,
  listBirthCharts,
  updateBirthChart,
} from '@stellaeum/core/charts/birth-data'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

const VALID_INPUT = {
  name: 'Тест',
  birthDate: '1990-05-15',
  birthTimeKnown: true,
  birthTime: '08:30',
  approximateTimeRange: null,
  cityId: null,
  cityName: 'Sofia',
  latitude: 42.7,
  longitude: 23.3,
  manualCoordinates: false,
}

describe('listBirthCharts', () => {
  it('returns an empty array, not throwing, when the user has no charts', async () => {
    mockSupabase.push('charts', { data: [] })

    const result = await listBirthCharts('user-1')

    expect(result).toEqual([])
  })

  it('throws when the query errors (caller — the route — must catch this, does not swallow it)', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'db down' } })

    await expect(listBirthCharts('user-1')).rejects.toBeTruthy()
  })
})

describe('createBirthChart', () => {
  it('upserts the users row (ignoreDuplicates) before inserting the chart, so a brand-new user does not violate the charts.user_id FK', async () => {
    mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user-1' } })

    await createBirthChart('user-1', VALID_INPUT)

    const usersCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'users')
    expect(usersCall).toBeTruthy()
    // users call must happen before the charts insert call, per the function's
    // own stated ordering rationale (FK constraint) — not just "was called".
    const fromCallOrder = mockSupabase.from.mock.calls.map((c) => c[0])
    expect(fromCallOrder.indexOf('users')).toBeLessThan(fromCallOrder.indexOf('charts'))
  })

  it('converts birthDate to a UTC-midnight ISO string, not a locally-parsed date (avoids the classic off-by-one-day bug across timezones)', async () => {
    let insertedPayload: Record<string, unknown> | undefined
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'charts') {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertedPayload = payload
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'chart-1', ...payload }, error: null }),
              }),
            }
          }),
        }
      }
      return { upsert: vi.fn(() => Promise.resolve({ data: null, error: null })) }
    })

    await createBirthChart('user-1', VALID_INPUT)

    expect(insertedPayload?.birth_date).toBe('1990-05-15T00:00:00.000Z')
  })

  it('returns ok:false INSERT_FAILED (not a throw) when the insert errors — the route depends on this to produce a clean Bulgarian error, not an unhandled exception', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'unique violation' } })

    const result = await createBirthChart('user-1', VALID_INPUT)

    expect(result).toEqual({ ok: false, error: 'INSERT_FAILED', message: 'unique violation' })
  })
})

describe('getBirthChart', () => {
  it('scopes the lookup by user_id in the same query, not as a post-fetch check (an ownership-check-after-fetch would leak existence via timing/error-shape differences)', async () => {
    mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user-1' } })

    await getBirthChart('user-1', 'chart-1')

    const builder = mockSupabase.from.mock.results[0].value
    expect(builder.eq).toHaveBeenCalledWith('id', 'chart-1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('returns NOT_FOUND (not the raw Supabase error) on a miss', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'no rows' } })

    const result = await getBirthChart('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' })
  })
})

describe('updateBirthChart', () => {
  it('only includes explicitly-provided fields in the update payload — an undefined field must not overwrite existing data with null', async () => {
    let updatePayload: Record<string, unknown> | undefined
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'charts') {
        return {
          update: vi.fn((payload: Record<string, unknown>) => {
            updatePayload = payload
            return {
              eq: () => ({
                eq: () => ({
                  select: () => ({
                    single: () => Promise.resolve({ data: { id: 'chart-1' }, error: null }),
                  }),
                }),
              }),
            }
          }),
        }
      }
      return { delete: vi.fn(() => ({ eq: () => Promise.resolve({ data: null, error: null }) })) }
    })

    await updateBirthChart('user-1', 'chart-1', { name: 'New name' })

    expect(updatePayload).toHaveProperty('name', 'New name')
    expect(updatePayload).not.toHaveProperty('birth_date')
    expect(updatePayload).not.toHaveProperty('latitude')
  })

  it('invalidates (deletes) the chart_calculations cache row after a successful update — a stale cached natal chart after an edit is a correctness bug, not a perf nit', async () => {
    mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user-1' } })
    mockSupabase.push('chart_calculations', { data: null, error: null })

    await updateBirthChart('user-1', 'chart-1', { name: 'New name' })

    const calcCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'chart_calculations')
    expect(calcCall).toBeTruthy()
    const calcBuilder = mockSupabase.from.mock.results.find((r, i) => mockSupabase.from.mock.calls[i][0] === 'chart_calculations')
    expect(calcBuilder?.value.delete).toHaveBeenCalled()
  })

  it('does NOT delete the cache when the update itself fails (nothing changed, nothing to invalidate)', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'no rows' } })

    await updateBirthChart('user-1', 'chart-1', { name: 'New name' })

    const calcCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'chart_calculations')
    expect(calcCall).toBeFalsy()
  })
})

describe('deleteBirthChart', () => {
  it('scopes the delete by both id and user_id (cannot delete another user\'s chart by guessing an id)', async () => {
    mockSupabase.push('charts', { data: null, error: null })

    await deleteBirthChart('user-1', 'chart-1')

    const builder = mockSupabase.from.mock.results[0].value
    expect(builder.eq).toHaveBeenCalledWith('id', 'chart-1')
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
  })

  it('returns ok:false DELETE_FAILED on error rather than throwing', async () => {
    mockSupabase.push('charts', { data: null, error: { message: 'fk violation' } })

    const result = await deleteBirthChart('user-1', 'chart-1')

    expect(result).toEqual({ ok: false, error: 'DELETE_FAILED', message: 'fk violation' })
  })
})
