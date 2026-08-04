#!/usr/bin/env node
/**
 * probe-diary-schema — verifies the live `public.diary_entries` schema
 * matches the DDL sealed in §8.2 (.planning/phases/08-diary-persistence/
 * 08-02-SCHEMA.md).
 *
 * The 14-fact coverage list (expands to 19 concrete facts because
 * length-CHECKs are per-slot, RLS policies are per-command, and
 * columnSpecs is one probe with 8 sub-checks) lives in
 * `./lib/diary-facts.mjs` so the dry-run script can import the same
 * list and run it inside a BEGIN/ROLLBACK transaction.
 *
 * Run:
 *   DATABASE_URL=<connection-string> node apps/web/scripts/diagnostics/probe-diary-schema.mjs
 *   # or via env-file:
 *   node --env-file=apps/web/.env.example.local apps/web/scripts/diagnostics/probe-diary-schema.mjs
 *
 * The `DATABASE_URL` must be a direct-Postgres connection string
 * (postgres://...) — this script reads information_schema and
 * pg_catalog, which PostgREST (used by @supabase/supabase-js) doesn't
 * expose.
 *
 * Exit codes: 0 all pass, 1 any fail, 2 DB unreachable / config error.
 *
 * Output is plain text suitable to commit verbatim as probe evidence
 * (redirect stdout into 08-03-PROBE-PROD.txt).
 */

import { runProbe } from './lib/schema-probe.mjs'
import { FACTS } from './lib/diary-facts.mjs'

runProbe({ facts: FACTS, label: 'probe-diary-schema (14 facts from §8.3)' })
