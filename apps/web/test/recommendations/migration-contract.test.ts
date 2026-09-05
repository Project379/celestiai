import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'

async function migrationSql() {
  return readFile(
    new URL('../../../../supabase/migrations/20260831180000_media_recommendations.sql', import.meta.url),
    'utf8',
  )
}

describe('media recommendation migration invariants', () => {
  it('enforces one active delivery and two revisions at most', async () => {
    const sql = await migrationSql()
    expect(sql).toContain("CHECK (revision IN (0, 1))")
    expect(sql).toContain('recommendation_deliveries_one_active_idx')
    expect(sql).toContain('UNIQUE (user_id, slot, period_key, revision)')
  })

  it('locks the original row and blocks direct authenticated reroll execution', async () => {
    const sql = await migrationSql()
    expect(sql).toContain('FOR UPDATE;')
    expect(sql).toContain("current_delivery.revision <> 0")
    expect(sql).toContain('FROM PUBLIC, anon, authenticated;')
    expect(sql).toContain('TO service_role;')
  })

  it('marks seeded provider works and artwork development-only', async () => {
    const sql = await migrationSql()
    expect(sql).toContain("'tmdb-development'")
    expect(sql).toContain("'open-library-development'")
    expect(sql).toContain("'development', 'published'")
    expect(sql).toContain('license_verified, is_primary')
  })
})

