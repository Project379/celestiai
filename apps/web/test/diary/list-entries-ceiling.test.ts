import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * 2026-08-26 sweep finding #10: listDiaryEntries had no .limit() anywhere,
 * so a single query could return truly unbounded data — the client hook
 * (useManifestEntries) fetches the whole list once and keeps it all in
 * memory. This is a DEFENSIVE CEILING ONLY, not a real fix (see the
 * comment above DIARY_ENTRIES_HARD_CEILING in entries.ts) — the real fix
 * is pagination end-to-end, filed for the UI phase since it's a UX design
 * decision. This test only proves the query is bounded at all. Per
 * standing discipline, run against the pre-fix function (no .limit() call)
 * and confirmed the assertion on the mock's .limit() call would fail
 * before the fix was restored.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { listDiaryEntries } from '@stellaeum/core/diary/entries'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

describe('listDiaryEntries — defensive ceiling (2026-08-26 sweep #10)', () => {
  it('calls .limit() with a bounded, positive number on every query', async () => {
    mockSupabase.push('diary_entries', { data: [] })

    await listDiaryEntries('user-1')

    const builder = mockSupabase.from.mock.results[0].value
    expect(builder.limit).toHaveBeenCalledTimes(1)
    const [limitArg] = builder.limit.mock.calls[0]
    expect(typeof limitArg).toBe('number')
    expect(limitArg).toBeGreaterThan(0)
    expect(limitArg).toBeLessThan(10_000)
  })

  it('still applies the ceiling when a phaseId filter is passed', async () => {
    mockSupabase.push('diary_entries', { data: [] })

    await listDiaryEntries('user-1', { phaseId: 'new-moon' })

    const builder = mockSupabase.from.mock.results[0].value
    expect(builder.limit).toHaveBeenCalledTimes(1)
  })
})
