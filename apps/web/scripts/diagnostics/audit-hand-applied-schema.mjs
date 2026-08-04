#!/usr/bin/env node
/**
 * audit-hand-applied-schema — find live Postgres objects (RLS state,
 * policies, functions, triggers, indexes, constraints) that have no
 * textual trace in supabase/migrations/*.sql.
 *
 * Invoke:
 *   node --env-file=apps/web/.env.local \
 *        apps/web/scripts/diagnostics/audit-hand-applied-schema.mjs
 *
 * Why this exists: 2026-08-03 RLS audit (triggered by a SECURITY-MODEL.md
 * drift finding) found `crystal_recommendations` with RLS disabled in
 * production despite being an active per-user table, and nine tables
 * (the connection_, relationship_, saved_people_ families plus
 * compatibility_reports — Stream K schema) with complete RLS, policies,
 * FKs, and triggers in production and ZERO migration history, not even
 * CREATE TABLE. Hand-applied schema changes (via the Supabase SQL Editor
 * or dashboard) are invisible to migration history by definition — this
 * script is the "assume this is not the only one" check, not a one-time
 * fix.
 *
 * METHOD AND ITS LIMITS — read before trusting a clean run:
 * This does a live pg_catalog / information_schema scan, then a
 * case-insensitive substring search for each object's name across the
 * concatenated text of every migration file. That's a heuristic, not
 * proof: a name appearing in a migration doesn't guarantee the migration
 * actually creates that exact object (a comment mentioning a table name
 * would false-negative as "found"), and dependency ordering, extension
 * availability (see NOTE below), and syntax correctness are not checked
 * at all. The only real proof that migration history reproduces
 * production is replaying it into a genuinely empty database — this
 * script does not do that; it never mutates anything, read-only against
 * whatever DATABASE_URL points at.
 *
 * To get real proof: `supabase start` (local Docker Postgres) + `supabase
 * db reset` (replays supabase/migrations/ from empty), then run this same
 * script against the local DB's connection string. A clean run there,
 * cross-checked against a live production dump, is the actual answer to
 * "does history alone reproduce state" — this script's live-DB mode is a
 * fast heuristic to run often, not a substitute for that reset.
 *
 * NOTE on gen_random_uuid(): every migration using it relies on Supabase's
 * default project template already enabling the extension that provides
 * it (pgcrypto, or native in PG13+ depending on image) — no migration
 * here explicitly `CREATE EXTENSION`s it. This works on any
 * Supabase-provisioned Postgres (dashboard project or `supabase start`'s
 * local image) but would NOT work on a bare vanilla self-hosted Postgres.
 * Not a bug today; worth knowing if this project ever leaves Supabase.
 *
 * Requires DATABASE_URL (direct Postgres connection, not the PostgREST
 * surface — same requirement as audit-schema-drift.mjs).
 */

import postgres from 'postgres'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env (postgres connection string).')
  process.exit(2)
}

async function loadMigrationText() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql'))
  let text = ''
  for (const f of files) {
    text += (await readFile(join(MIGRATIONS_DIR, f), 'utf8')) + '\n'
  }
  return text.toLowerCase()
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, idle_timeout: 5, max: 2 })
  const migrationText = await loadMigrationText()
  const foundIn = (name) => migrationText.includes(name.toLowerCase())

  let flagged = 0
  const report = (category, label, ok) => {
    if (!ok) flagged++
    console.log(`${ok ? '  ok  ' : '[GAP] '}${category}  ${label}`)
  }

  try {
    console.log('=== Tables with RLS enabled, and whether that state has migration text ===')
    const rlsTables = await sql`
      SELECT relname FROM pg_class
      WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND relrowsecurity = true
      ORDER BY relname
    `
    for (const t of rlsTables) {
      report('RLS      ', t.relname, foundIn(t.relname) && foundIn('enable row level security'))
    }

    console.log('\n=== Tables WITHOUT RLS enabled — flag any with a user_id column ===')
    const noRlsTables = await sql`
      SELECT c.relname FROM pg_class c
      WHERE c.relnamespace = 'public'::regnamespace AND c.relkind = 'r' AND c.relrowsecurity = false
      ORDER BY c.relname
    `
    for (const t of noRlsTables) {
      const hasUserId = await sql`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name=${t.relname} AND column_name='user_id'
      `
      if (hasUserId.length > 0) {
        report('NO-RLS   ', `${t.relname}  (has user_id column — likely should have RLS)`, false)
      } else {
        console.log(`  --   NO-RLS    ${t.relname}  (no user_id column, not flagged)`)
      }
    }

    console.log('\n=== Policies — present in some migration file? ===')
    const policies = await sql`
      SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname
    `
    for (const p of policies) {
      report('POLICY   ', `${p.tablename}.${p.policyname}`, foundIn(p.policyname))
    }

    console.log('\n=== Functions (public schema) — present in some migration file? ===')
    const functions = await sql`
      SELECT p.proname FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' ORDER BY p.proname
    `
    for (const f of functions) {
      report('FUNCTION ', f.proname, foundIn(f.proname))
    }

    console.log('\n=== Triggers (public schema) — present in some migration file? ===')
    const triggers = await sql`
      SELECT tgname, relname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
      WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
      ORDER BY relname, tgname
    `
    for (const t of triggers) {
      report('TRIGGER  ', `${t.relname}.${t.tgname}`, foundIn(t.tgname))
    }

    console.log('\n=== Non-PK/unique indexes (public schema) — present in some migration file? ===')
    const indexes = await sql`
      SELECT i.indexname, i.tablename FROM pg_indexes i
      WHERE i.schemaname='public'
        AND NOT EXISTS (
          SELECT 1 FROM pg_constraint c
          WHERE c.conname = i.indexname AND c.connamespace = 'public'::regnamespace
        )
      ORDER BY i.tablename, i.indexname
    `
    for (const i of indexes) {
      report('INDEX    ', `${i.tablename}.${i.indexname}`, foundIn(i.indexname))
    }

    console.log('\n=== Constraints (public schema) — present in some migration file? ===')
    console.log('(PRIMARY KEY constraints skipped — Postgres auto-names them "<table>_pkey"')
    console.log(' deterministically from an inline PRIMARY KEY column, so they never appear')
    console.log(' as literal text even when the migration correctly creates them; flagging')
    console.log(' every single one is 100% false positive, not a real signal.)')
    const constraints = await sql`
      SELECT conname, conrelid::regclass::text AS table_name FROM pg_constraint
      WHERE connamespace = 'public'::regnamespace AND contype != 'p'
      ORDER BY table_name, conname
    `
    for (const c of constraints) {
      report('CONSTRAINT', `${c.table_name}.${c.conname}`, foundIn(c.conname))
    }

    console.log(`\n${flagged === 0 ? 'PASS' : 'FLAGGED'}: ${flagged} object(s) with no textual trace in migration history.`)
    process.exit(flagged > 0 ? 1 : 0)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('audit-hand-applied-schema crashed:', err)
  process.exit(2)
})
