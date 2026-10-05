import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Static guard (runs in check:all, no DB) for the one migration mistake that
 * silently breaks every existing user: stamping charts.birth_data_edited_at
 * with the migration time. That makes every existing reading and horoscope
 * stale on deploy and regenerates them quota-free.
 *
 * The LIVE proof (against production data, rolled back) is
 * apps/web/scripts/diagnostics/test-birth-data-edit-migration.mjs, which has a
 * --naive mode that goes red (12 readings / 45 horoscopes stale). This guard
 * is red-first too: it is run below against the naive SQL and must flag it.
 */

function violations(sql: string): string[] {
  const out: string[] = []
  const flat = sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ')
  if (/ADD COLUMN (IF NOT EXISTS )?birth_data_edited_at [^;]*NOT NULL[^;]*DEFAULT now\(\)/i.test(flat) ||
      /ADD COLUMN (IF NOT EXISTS )?birth_data_edited_at [^;]*DEFAULT now\(\)[^;]*NOT NULL/i.test(flat)) {
    out.push('adds birth_data_edited_at NOT NULL DEFAULT now() in one statement (stamps every existing chart with the deploy time)')
  }
  const backfill = flat.search(/UPDATE public\.charts SET birth_data_edited_at = created_at/i)
  const notNull = flat.search(/ALTER COLUMN birth_data_edited_at SET NOT NULL/i)
  if (backfill === -1) out.push('no backfill to created_at')
  if (notNull !== -1 && backfill !== -1 && backfill > notNull) out.push('backfill runs after SET NOT NULL')
  return out
}

describe('birth_data_edited_at migration', () => {
  it('guard goes RED against the naive DEFAULT now() variant (red-first proof)', () => {
    const naive = 'ALTER TABLE public.charts ADD COLUMN birth_data_edited_at timestamptz NOT NULL DEFAULT now();'
    expect(violations(naive).length).toBeGreaterThan(0)
  })

  it('the real migration backfills existing charts to created_at (not now()) before NOT NULL / DEFAULT', () => {
    const file = path.resolve(__dirname, '../../../../supabase/migrations/20261001160000_birth_data_edit_invalidation.sql')
    expect(violations(readFileSync(file, 'utf8'))).toEqual([])
  })

  it('the edits table is service-role only: RLS enabled, no policies, function not executable by anon/authenticated', () => {
    const file = path.resolve(__dirname, '../../../../supabase/migrations/20261001160000_birth_data_edit_invalidation.sql')
    const sql = readFileSync(file, 'utf8')
    expect(sql).toMatch(/ALTER TABLE public\.birth_data_edits ENABLE ROW LEVEL SECURITY/)
    expect(sql).not.toMatch(/CREATE POLICY[^;]*birth_data_edits/i)
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.apply_birth_data_edit\(text, uuid, jsonb\) FROM anon, authenticated/)
  })
})
