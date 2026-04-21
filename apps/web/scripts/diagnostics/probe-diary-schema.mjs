#!/usr/bin/env node
/**
 * probe-diary-schema — verifies the live `public.diary_entries` schema
 * matches the DDL sealed in §8.2 (.planning/phases/08-diary-persistence/
 * 08-02-SCHEMA.md).
 *
 * 14-fact coverage list from §8.3 prerequisites:
 *   1. Table exists
 *   2. Column specs match exactly (8 columns: id / user_id / entry_date
 *      / phase_id / phase_name / intentions / created_at / updated_at)
 *   3. PRIMARY KEY on (id)
 *   4. UNIQUE (user_id, entry_date)
 *   5. Index (user_id, phase_id) present
 *   6. Index (user_id, entry_date DESC) absent
 *   7. CHECK array_length(intentions, 1) = 3
 *   8. CHECK char_length(intentions[i]) BETWEEN 1 AND 500 — per slot (×3)
 *   9. RLS enabled on the table
 *  10. RLS policies: SELECT / INSERT / UPDATE / DELETE on user_id match
 *  11. Trigger diary_entries_updated_at calls public.set_updated_at()
 *  12. Function public.set_updated_at() exists with generic body
 *  13. COMMENT ON COLUMN phase_id documents LunarPhaseId enum values
 *  14. COMMENT ON FUNCTION public.set_updated_at() present
 *
 * Run:
 *   DATABASE_URL=<connection-string> node apps/web/scripts/diagnostics/probe-diary-schema.mjs
 *   # or via env-file:
 *   node --env-file=apps/web/.env.local apps/web/scripts/diagnostics/probe-diary-schema.mjs
 *
 * The `DATABASE_URL` must be a direct-Postgres connection string
 * (postgres://...) — this script reads information_schema and
 * pg_catalog, which PostgREST (used by @supabase/supabase-js) doesn't
 * expose.
 *
 * Exit codes: 0 all pass, 1 any fail, 2 DB unreachable / config error.
 *
 * Output is plain text suitable to commit verbatim as probe evidence
 * (redirect stdout into 08-03-PROBE-BRANCH.txt / 08-03-PROBE-PROD.txt).
 */

import {
  runProbe,
  tableExists,
  columnSpecs,
  primaryKey,
  uniqueConstraint,
  indexExists,
  indexAbsent,
  checkConstraint,
  rlsEnabled,
  rlsPolicy,
  triggerExists,
  functionExists,
  columnComment,
  functionComment,
} from './lib/schema-probe.mjs'

const JWT_EXPR_FRAGMENT = "auth.jwt()"  // policy-expression substring check

const FACTS = [
  // 1. Table exists
  tableExists({ table: 'diary_entries' }),

  // 2. Column specs (one fact, 8 sub-checks; failures listed individually)
  columnSpecs({
    table: 'diary_entries',
    columns: [
      { column: 'id', dataType: 'uuid', nullable: false, defaultContains: 'gen_random_uuid' },
      { column: 'user_id', dataType: 'text', nullable: false, defaultContains: 'auth.jwt' },
      { column: 'entry_date', dataType: 'date', nullable: false },
      { column: 'phase_id', dataType: 'text', nullable: false },
      { column: 'phase_name', dataType: 'text', nullable: false },
      { column: 'intentions', dataType: 'ARRAY', udtName: '_text', nullable: false },
      { column: 'created_at', dataType: 'timestamp with time zone', nullable: false, defaultContains: 'now' },
      { column: 'updated_at', dataType: 'timestamp with time zone', nullable: false, defaultContains: 'now' },
    ],
  }),

  // 3. PRIMARY KEY on (id)
  primaryKey({ table: 'diary_entries', columns: ['id'] }),

  // 4. UNIQUE (user_id, entry_date)
  uniqueConstraint({
    table: 'diary_entries',
    columns: ['user_id', 'entry_date'],
    constraintName: 'diary_entries_unique_user_date',
  }),

  // 5. Index (user_id, phase_id) present
  indexExists({
    table: 'diary_entries',
    indexName: 'diary_entries_user_phase_idx',
    columnsSubstring: ['user_id', 'phase_id'],
  }),

  // 6. Index (user_id, entry_date DESC) absent — explicit drop per §8.2
  indexAbsent({
    table: 'diary_entries',
    forbiddenSubstring: 'entry_date DESC',
    reason: '§8.2 dropped the DESC hedge; UNIQUE ASC reverse-scans on PG 13+',
  }),

  // 7. CHECK array_length(intentions, 1) = 3
  checkConstraint({
    table: 'diary_entries',
    constraintName: 'diary_entries_intentions_count',
    expressionSubstring: 'array_length(intentions, 1) = 3',
  }),

  // 8a. CHECK char_length(intentions[1]) BETWEEN 1 AND 500
  checkConstraint({
    table: 'diary_entries',
    constraintName: 'diary_entries_intention_1_len',
    expressionSubstring: 'char_length(intentions[1])',
  }),

  // 8b. CHECK char_length(intentions[2]) BETWEEN 1 AND 500
  checkConstraint({
    table: 'diary_entries',
    constraintName: 'diary_entries_intention_2_len',
    expressionSubstring: 'char_length(intentions[2])',
  }),

  // 8c. CHECK char_length(intentions[3]) BETWEEN 1 AND 500
  checkConstraint({
    table: 'diary_entries',
    constraintName: 'diary_entries_intention_3_len',
    expressionSubstring: 'char_length(intentions[3])',
  }),

  // 9. RLS enabled
  rlsEnabled({ table: 'diary_entries' }),

  // 10a. SELECT policy
  rlsPolicy({
    table: 'diary_entries',
    policyName: 'diary_entries_select_own',
    command: 'SELECT',
    expressionSubstring: JWT_EXPR_FRAGMENT,
  }),

  // 10b. INSERT policy
  rlsPolicy({
    table: 'diary_entries',
    policyName: 'diary_entries_insert_own',
    command: 'INSERT',
    expressionSubstring: JWT_EXPR_FRAGMENT,
  }),

  // 10c. UPDATE policy
  rlsPolicy({
    table: 'diary_entries',
    policyName: 'diary_entries_update_own',
    command: 'UPDATE',
    expressionSubstring: JWT_EXPR_FRAGMENT,
  }),

  // 10d. DELETE policy
  rlsPolicy({
    table: 'diary_entries',
    policyName: 'diary_entries_delete_own',
    command: 'DELETE',
    expressionSubstring: JWT_EXPR_FRAGMENT,
  }),

  // 11. Trigger exists and calls public.set_updated_at
  triggerExists({
    table: 'diary_entries',
    triggerName: 'diary_entries_updated_at',
    functionName: 'public.set_updated_at',
  }),

  // 12. Function public.set_updated_at exists with generic body
  //     (source check for 'NEW.updated_at = now()' core assignment)
  functionExists({
    name: 'set_updated_at',
    sourceSubstring: 'NEW.updated_at',
  }),

  // 13. COMMENT ON COLUMN phase_id mentions the LunarPhaseId enum
  columnComment({
    table: 'diary_entries',
    column: 'phase_id',
    substring: 'LunarPhaseId',
  }),

  // 14. COMMENT ON FUNCTION public.set_updated_at mentions its generic purpose
  functionComment({
    name: 'set_updated_at',
    substring: 'Generic',
  }),
]

runProbe({ facts: FACTS, label: 'probe-diary-schema (14 facts from §8.3)' })
