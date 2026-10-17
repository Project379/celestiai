import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  analyzeMigrations,
  findAllowlistProblems,
  findCoverageGaps,
  type AllowlistEntry,
} from './data-coverage-lib'

/**
 * DATA-COVERAGE GATE (added 2026-10-07; part of check:all via `check:data-coverage`).
 *
 * Every table with a user-owned column, read from supabase/migrations, must appear in
 * BOTH the account-deletion path and the GDPR export, unless it is on the allowlist
 * below WITH a reason. This is what makes "did we remember the new table?" a failing
 * test instead of a checklist item: when Petko's diary v2 migration (diary reminder
 * tables) lands in supabase/migrations, its tables are checked automatically.
 *
 * ALLOWLIST RULES: an entry needs a real reason (>= 20 characters). A reason starting
 * with "UNDECIDED" is a policy question for the founder, not an excuse: it is printed on
 * every run so it cannot be forgotten. Stale entries (the table is covered now, or no
 * longer exists) fail the gate.
 */
const root = path.resolve(__dirname, '../../../..')
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8')

const ALLOWLIST: Record<string, AllowlistEntry> = {
  audit_logs: {
    deletion:
      'user_id is ON DELETE SET NULL by design (apps/web/lib/audit.ts): audit rows survive anonymised after the user is deleted. A retention choice, not an omission.',
  },
  crystal_recommendations: {
    deletion:
      'Deleted through chart_id -> charts ON DELETE CASCADE when the cleanup cron deletes the user\'s charts (user_id itself has no foreign key).',
  },
}

function loadMigrations(): string[] {
  const dir = path.join(root, 'supabase/migrations')
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(path.join(dir, f), 'utf8'))
}

const DELETION_SOURCES = [
  'apps/web/app/api/cron/cleanup-deleted-accounts/route.ts',
  'apps/web/app/api/gdpr/delete-account/route.ts',
  'packages/core/src/diary/entries.ts',
]
const EXPORT_SOURCES = ['apps/web/app/api/gdpr/export/route.ts']

const deletionSource = DELETION_SOURCES.map(read).join('\n')
const exportSource = EXPORT_SOURCES.map(read).join('\n')

describe('data-coverage gate (real tree)', () => {
  const coverage = analyzeMigrations(loadMigrations())

  it('finds the user-owned tables in the migrations (sanity: the parser is not silently empty)', () => {
    expect(Object.keys(coverage.owned).length).toBeGreaterThan(15)
    for (const t of ['users', 'charts', 'ai_readings', 'diary_entries', 'push_tokens']) {
      expect(coverage.owned, t).toHaveProperty(t)
    }
  })

  it('every user-owned table is in the deletion path and in the GDPR export, or allowlisted with a reason', () => {
    const gaps = findCoverageGaps(coverage, deletionSource, exportSource, ALLOWLIST)
    expect(
      gaps.map((g) => `${g.table} is missing from the ${g.missing === 'deletion' ? 'account-deletion path (cron/cleanup-deleted-accounts)' : 'GDPR export (/api/gdpr/export)'} — owner column(s): ${g.ownerColumns.join(', ')}`),
    ).toEqual([])
  })

  it('the allowlist has no typos, no empty reasons and no stale entries', () => {
    expect(findAllowlistProblems(coverage, deletionSource, exportSource, ALLOWLIST)).toEqual([])
  })

  it('prints the undecided policy questions so they stay visible', () => {
    const undecided = Object.entries(ALLOWLIST).flatMap(([t, e]) =>
      (['deletion', 'export'] as const).filter((s) => e[s]?.startsWith('UNDECIDED')).map((s) => `${t}.${s}`),
    )
    if (undecided.length > 0) console.warn(`[data-coverage] UNDECIDED founder rulings pending: ${undecided.join(', ')}`)
    expect(undecided.length).toBeLessThan(50)
  })
})

describe('data-coverage gate (proof it can fail: a fake table)', () => {
  const FAKE_MIGRATION = `
    create table public.diary_reminder_preferences_fake (
      id uuid primary key default gen_random_uuid(),
      user_id text not null,
      hour int not null
    );
  `

  it('flags a new user-owned table that is in neither the deletion path nor the export', () => {
    const coverage = analyzeMigrations([...loadMigrations(), FAKE_MIGRATION])
    const gaps = findCoverageGaps(coverage, deletionSource, exportSource, ALLOWLIST)
    expect(gaps.map((g) => `${g.table}:${g.missing}`).sort()).toEqual([
      'diary_reminder_preferences_fake:deletion',
      'diary_reminder_preferences_fake:export',
    ])
  })

  it('accepts a new table once it has a cascade foreign key (deletion) and an export query', () => {
    const migration = `
      create table public.fake_ok (
        id uuid primary key,
        user_id text not null references public.users (clerk_id) on delete cascade
      );`
    const coverage = analyzeMigrations([migration])
    expect(findCoverageGaps(coverage, '', "supabase.from('fake_ok').select('*')", {})).toEqual([])
    // ...and still flags it if the export forgot it
    expect(findCoverageGaps(coverage, '', '', {}).map((g) => g.missing)).toEqual(['export'])
  })

  it('catches owner columns added later by ALTER TABLE, and ignores dropped tables', () => {
    const coverage = analyzeMigrations([
      'create table public.late_owner (id uuid primary key);',
      'alter table public.late_owner add column user_id text;',
      'create table public.gone (id uuid, user_id text);',
      'drop table public.gone;',
    ])
    expect(Object.keys(coverage.owned)).toEqual(['late_owner'])
  })

  it('fails the allowlist check for a stale entry and for a one-word reason', () => {
    const coverage = analyzeMigrations(['create table public.t (user_id text);'])
    const stale = findAllowlistProblems(coverage, "from('t')", '', { t: { deletion: 'x'.repeat(25) } })
    expect(stale.join()).toMatch(/IS covered now/)
    const short = findAllowlistProblems(coverage, '', '', { t: { export: 'todo' } })
    expect(short.join()).toMatch(/too short/)
    const typo = findAllowlistProblems(coverage, '', '', { tt: { export: 'x'.repeat(25) } })
    expect(typo.join()).toMatch(/no owner column/)
  })
})
