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
  process.env.SUPABASE_SECRET_KEY = 'test-service-key'
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
    // Two 'charts' calls now: the cap count-check first, then the insert.
    mockSupabase.push('charts', { data: null, error: null, count: 0 })
    mockSupabase.push('charts', { data: { id: 'chart-1', user_id: 'user-1' } })

    await createBirthChart('user-1', VALID_INPUT)

    const usersCall = mockSupabase.from.mock.calls.find((c) => c[0] === 'users')
    expect(usersCall).toBeTruthy()
    // users call must happen before the charts INSERT call specifically (the
    // last 'charts' call), per the function's own stated ordering rationale
    // (FK constraint) — the count-check read is allowed to precede it.
    const fromCallOrder = mockSupabase.from.mock.calls.map((c) => c[0])
    expect(fromCallOrder.indexOf('users')).toBeLessThan(fromCallOrder.lastIndexOf('charts'))
  })

  it('converts birthDate to a UTC-midnight ISO string, not a locally-parsed date (avoids the classic off-by-one-day bug across timezones)', async () => {
    let insertedPayload: Record<string, unknown> | undefined
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'charts') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ count: 0, error: null })),
          })),
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
    mockSupabase.push('charts', { data: null, error: null, count: 0 })
    mockSupabase.push('charts', { data: null, error: { message: 'unique violation' } })

    const result = await createBirthChart('user-1', VALID_INPUT)

    expect(result).toEqual({ ok: false, error: 'INSERT_FAILED', message: 'unique violation' })
  })

  it('returns ok:false CHART_LIMIT_REACHED, without ever reaching the insert, once the caller already has MAX_CHARTS_PER_USER charts (2026-08-26 sweep finding #3 — chained with the horoscope quota gap, uncapped chart creation let a free account reach thousands of unquota\'d paid generations/day)', async () => {
    mockSupabase.push('charts', { data: null, error: null, count: 20 })

    const result = await createBirthChart('user-1', VALID_INPUT)

    expect(result).toEqual({
      ok: false,
      error: 'CHART_LIMIT_REACHED',
      message: 'Chart limit of 20 reached.',
    })
    // Only the count-check call happened — no insert, no users upsert.
    const fromCallOrder = mockSupabase.from.mock.calls.map((c) => c[0])
    expect(fromCallOrder).toEqual(['charts'])
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
  const RPC_OK = {
    chart: { id: 'chart-1', birth_data_edited_at: '2026-10-01T10:00:00.000Z' },
    birth_data_changed: true,
    quota_exempt: true,
  }

  it('edits through apply_birth_data_edit on the EXISTING chart id — never an insert — and sends only the provided fields (an undefined field must not overwrite data with null)', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', { data: RPC_OK })

    await updateBirthChart('user-1', 'chart-1', { name: 'New name' })

    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1)
    const [fn, args] = mockSupabase.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>]
    expect(fn).toBe('apply_birth_data_edit')
    expect(args.p_user_id).toBe('user-1')
    expect(args.p_chart_id).toBe('chart-1')
    expect(args.p_changes).toEqual({ name: 'New name' })
    expect(mockSupabase.from).not.toHaveBeenCalled() // no direct insert/update/delete from here
  })

  it('maps the camelCase input to the snake_case columns the function expects, birth date as an ISO midnight-UTC string', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', { data: RPC_OK })

    await updateBirthChart('user-1', 'chart-1', {
      birthDate: '1990-05-15',
      birthTimeKnown: false,
      birthTime: null,
      approximateTimeRange: 'morning',
      cityId: null,
      cityName: 'Plovdiv',
      latitude: 42.1,
      longitude: 24.7,
    } as never)

    const args = (mockSupabase.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>])[1]
    expect(args.p_changes).toEqual({
      birth_date: '1990-05-15T00:00:00.000Z',
      birth_time_known: false,
      birth_time: null,
      approximate_time_range: 'morning',
      city_id: null,
      city_name: 'Plovdiv',
      latitude: 42.1,
      longitude: 24.7,
    })
  })

  it('sends NO tier input — the free regrant is spent at generation time and a premium edit never touches it', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', { data: RPC_OK })

    await updateBirthChart('user-1', 'chart-1', { name: 'a' })

    const args = (mockSupabase.rpc.mock.calls[0] as unknown as [string, Record<string, unknown>])[1]
    expect(Object.keys(args).sort()).toEqual(['p_changes', 'p_chart_id', 'p_user_id'])
  })

  it('returns the updated chart and the edit outcome (changed / quotaExempt)', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', {
      data: { ...RPC_OK, quota_exempt: false },
    })

    const result = await updateBirthChart('user-1', 'chart-1', { name: 'x' })

    expect(result).toEqual({
      ok: true,
      data: RPC_OK.chart,
      edit: { birthDataChanged: true, quotaExempt: false },
    })
  })

  it('returns NOT_FOUND when no chart matches (id, user_id) — the function returns null', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', { data: null })

    const result = await updateBirthChart('user-1', 'chart-1', { name: 'x' })

    expect(result).toEqual({ ok: false, error: 'NOT_FOUND' })
  })

  it('returns UPDATE_FAILED (not NOT_FOUND) on a database error, so the route can 500 instead of lying with a 404', async () => {
    mockSupabase.pushRpc('apply_birth_data_edit', { data: null, error: { message: 'boom' } })

    const result = await updateBirthChart('user-1', 'chart-1', { name: 'x' })

    expect(result).toEqual({ ok: false, error: 'UPDATE_FAILED', message: 'boom' })
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
