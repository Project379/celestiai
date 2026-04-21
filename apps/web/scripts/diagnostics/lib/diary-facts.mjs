/**
 * diary-facts — the 14-fact coverage list for public.diary_entries
 * per §8.3 prerequisites. Pure data module with no side effects.
 *
 * Consumed by:
 *   - probe-diary-schema.mjs (runs against live DB)
 *   - dry-run-migration.mjs (runs against in-transaction DB via
 *     lib/schema-probe.mjs's runFactsOnClient)
 *
 * Keeping this list in its own module lets both consumers share the
 * single source of truth. If the sealed DDL in 08-02-SCHEMA.md
 * changes, update this file and both consumers pick up the change.
 *
 * Fact count: 19 (the §8.3 list of 14 expands into 19 concrete facts
 * because intention-length CHECKs are per-slot, RLS policies are
 * per-command, and the column-specs fact is one compound probe with
 * 8 sub-checks).
 */

import {
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
} from './schema-probe.mjs'

const JWT_EXPR_FRAGMENT = 'auth.jwt()'

export const FACTS = [
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
