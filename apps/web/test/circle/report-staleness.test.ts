import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Кръг reports are computed from chart data, so a birth-data edit makes them
 * stale (Batch 8 "b"): never served; the app already treats null as "analyze to
 * create a report". A saved-profile report is synastry against the user's
 * ACTIVE (latest) chart; a space report is stale once ANY member chart was edited.
 */

vi.mock('@/lib/supabase/service', () => ({ createServiceSupabaseClient: vi.fn() }))

import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { getLatestConnectionReport, getLatestSavedProfileReport } from '@/lib/circle/service'

let mockSupabase: MockSupabase

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  vi.mocked(createServiceSupabaseClient).mockReturnValue(mockSupabase as never)
})

describe('getLatestSavedProfileReport', () => {
  const report = (createdAt: string) => ({ id: 'r1', profile_id: 'p1', version: 1, created_at: createdAt })

  it('returns null when the report predates the active chart marker', async () => {
    mockSupabase.push('saved_people_reports', { data: report('2026-09-01T00:00:00.000Z') })
    mockSupabase.push('charts', { data: { birth_data_edited_at: '2026-09-10T00:00:00.000Z' } })

    expect(await getLatestSavedProfileReport('p1', 'user-1')).toBeNull()
  })

  it('returns the report when it was created after the marker', async () => {
    mockSupabase.push('saved_people_reports', { data: report('2026-09-11T00:00:00.000Z') })
    mockSupabase.push('charts', { data: { birth_data_edited_at: '2026-09-10T00:00:00.000Z' } })

    expect(await getLatestSavedProfileReport('p1', 'user-1')).toMatchObject({ id: 'r1' })
  })

  it('compares against the ACTIVE chart — the query orders the user\'s charts newest-first and takes one', async () => {
    mockSupabase.push('saved_people_reports', { data: report('2026-09-11T00:00:00.000Z') })
    mockSupabase.push('charts', { data: { birth_data_edited_at: '2026-01-01T00:00:00.000Z' } })

    await getLatestSavedProfileReport('p1', 'user-1')

    const idx = mockSupabase.from.mock.calls.findIndex((c) => c[0] === 'charts')
    const builder = mockSupabase.from.mock.results[idx].value
    expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(1)
  })

  it('returns null when there is no report at all', async () => {
    mockSupabase.push('saved_people_reports', { data: null })
    mockSupabase.push('charts', { data: { birth_data_edited_at: '2026-09-10T00:00:00.000Z' } })

    expect(await getLatestSavedProfileReport('p1', 'user-1')).toBeNull()
  })
})

describe('getLatestConnectionReport', () => {
  const report = (createdAt: string) => ({ id: 'cr1', space_id: 's1', version: 1, created_at: createdAt })

  it('returns null when ANY member chart was edited after the report was created', async () => {
    mockSupabase.push('connection_reports', { data: report('2026-09-05T00:00:00.000Z') })
    mockSupabase.push('connection_members', { data: [{ chart_id: 'c1' }, { chart_id: 'c2' }] })
    mockSupabase.push('charts', {
      data: [
        { birth_data_edited_at: '2026-04-01T00:00:00.000Z' },
        { birth_data_edited_at: '2026-09-08T00:00:00.000Z' }, // the second member edited later
      ],
    })

    expect(await getLatestConnectionReport('s1')).toBeNull()
  })

  it('returns the report when every member chart predates it', async () => {
    mockSupabase.push('connection_reports', { data: report('2026-09-05T00:00:00.000Z') })
    mockSupabase.push('connection_members', { data: [{ chart_id: 'c1' }, { chart_id: 'c2' }] })
    mockSupabase.push('charts', {
      data: [{ birth_data_edited_at: '2026-04-01T00:00:00.000Z' }, { birth_data_edited_at: '2026-05-01T00:00:00.000Z' }],
    })

    expect(await getLatestConnectionReport('s1')).toMatchObject({ id: 'cr1' })
  })

  it('returns null when there is no report', async () => {
    mockSupabase.push('connection_reports', { data: null })

    expect(await getLatestConnectionReport('s1')).toBeNull()
  })
})
