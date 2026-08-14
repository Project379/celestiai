import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockSupabase, type MockSupabase } from '../mocks/supabase'

/**
 * Tests packages/core/src/diary/entries.ts upsertDiaryEntry — Batch 5.5
 * finding #10. The initial SELECT ("does a row for this user+date exist?")
 * and the subsequent INSERT are not atomic: two concurrent upserts for the
 * same (user_id, entry_date) — a double-submit, or a client retry after a
 * timeout that actually succeeded — can both see "no existing row" and
 * both attempt the INSERT. The real diary_entries_unique_user_date
 * UNIQUE(user_id, entry_date) constraint (confirmed live in
 * 20260421150801_create_diary_entries.sql) correctly rejects the loser,
 * but that 23505 was previously surfaced as a generic UPSERT_FAILED,
 * breaking this function's own "always succeeds, idempotent upsert"
 * contract under concurrency.
 */

let mockSupabase: MockSupabase

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { upsertDiaryEntry } from '@stellaeum/core/diary/entries'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabase = createMockSupabase()
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
})

const INPUT = {
  entryDate: '2026-08-14',
  phaseId: 'new_moon',
  phaseName: 'Новолуние',
  intentions: ['Intention one', 'Intention two', 'Intention three'] as [string, string, string],
}

describe('upsertDiaryEntry — concurrent-insert race (Batch 5.5 #10)', () => {
  it('recovers from a 23505 on the INSERT (a losing racer) by updating the winner row instead of returning UPSERT_FAILED', async () => {
    // 1. Initial SELECT — no existing row (this request's own read).
    mockSupabase.push('diary_entries', { data: null })
    // 2. INSERT — loses the race; the DB constraint rejects it.
    mockSupabase.push('diary_entries', {
      data: null,
      error: {
        code: '23505',
        message: 'duplicate key value violates unique constraint "diary_entries_unique_user_date"',
      },
    })
    // 3. Recovery re-fetch SELECT — the winner's row, now visible.
    mockSupabase.push('diary_entries', {
      data: { id: 'row-winner', user_id: 'user_1', entry_date: INPUT.entryDate },
    })
    // 4. Recovery UPDATE — applies this request's own data onto the
    // winner's row.
    mockSupabase.push('diary_entries', {
      data: {
        id: 'row-winner',
        user_id: 'user_1',
        entry_date: INPUT.entryDate,
        phase_id: INPUT.phaseId,
        phase_name: INPUT.phaseName,
        intentions: INPUT.intentions,
      },
    })

    const result = await upsertDiaryEntry('user_1', INPUT)

    // Pre-fix: this returned { ok: false, error: 'UPSERT_FAILED' } — a
    // spurious 500 to a legitimate concurrent request. Post-fix: the
    // request still succeeds, applied via the recovery UPDATE.
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBe('row-winner')
      expect(result.created).toBe(false)
    }
  })

  it('still fails cleanly on a genuine (non-23505) insert error', async () => {
    mockSupabase.push('diary_entries', { data: null })
    mockSupabase.push('diary_entries', {
      data: null,
      error: { code: 'OTHER', message: 'connection reset' },
    })

    const result = await upsertDiaryEntry('user_1', INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('UPSERT_FAILED')
    }
  })
})
