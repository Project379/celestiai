/**
 * schema-probe — reusable primitives for verifying that a live Postgres
 * schema matches a migration's intended state. Used by per-table probe
 * scripts that declare a facts list and call `runProbe({ facts })`.
 *
 * Origin: §8.3 of the diary-persistence workstream. Introduced alongside
 * `probe-diary-schema.mjs` so that subsequent migrations can declare
 * their probes as a ~20-line facts file rather than a 200-line reinvention.
 * Matches the same discipline as the generic `public.set_updated_at()`
 * trigger function sealed in §8.2 Decision F.
 *
 * Connection: direct Postgres via the `postgres` npm package and a
 * `DATABASE_URL` env var. Not via `@supabase/supabase-js` — that client
 * goes through PostgREST and cannot read `information_schema` /
 * `pg_catalog`.
 *
 * Fact API. A "fact" is any object that exposes:
 *   {
 *     name: string,                                    // human label
 *     run: async (sql) => {
 *       passed: boolean,
 *       expected: string,
 *       actual: string,
 *       details?: string[],                            // optional sub-lines
 *     }
 *   }
 *
 * The fact factories exported below return such objects. Callers can
 * also author ad-hoc facts inline if a check doesn't fit a factory.
 *
 * Exit codes:
 *   0 — all facts passed
 *   1 — at least one fact failed
 *   2 — could not reach the DB / config error
 */

import postgres from 'postgres'

// ─── Connection + runner ──────────────────────────────────────────────

/**
 * Read DATABASE_URL and return a live `postgres` client. Call `end()`
 * when done (runProbe does this automatically).
 */
export function createClient(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL env (postgres connection string).')
    process.exit(2)
  }
  return postgres(databaseUrl, { prepare: false, idle_timeout: 5, max: 2 })
}

/**
 * Run the facts list in order, print a pass/fail table, exit with
 * code 0 on all-pass, 1 on any fail. Always closes the client.
 *
 * `label` is a freeform string printed at the top (e.g., the connection
 * target label).
 */
export async function runProbe({ facts, label, databaseUrl }) {
  const sql = createClient(databaseUrl)
  let passed = 0
  let failed = 0
  const lines = []

  try {
    const urlLabel = (databaseUrl ?? process.env.DATABASE_URL ?? '').replace(/:[^@/]+@/, ':***@')
    console.log(`schema-probe: ${label ?? 'unnamed'}`)
    console.log(`DB: ${urlLabel}`)
    console.log('')

    for (const fact of facts) {
      let result
      try {
        result = await fact.run(sql)
      } catch (err) {
        result = {
          passed: false,
          expected: '(no throw)',
          actual: `threw: ${err.message}`,
        }
      }
      const tag = result.passed ? 'PASS' : 'FAIL'
      const line = `[${tag}] ${fact.name}`
      lines.push(line)
      console.log(line)
      if (!result.passed) {
        console.log(`       expected: ${result.expected}`)
        console.log(`       actual:   ${result.actual}`)
      }
      if (result.details?.length) {
        for (const d of result.details) console.log(`       ${d}`)
      }
      result.passed ? passed++ : failed++
    }

    console.log('')
    console.log(`── summary ── ${passed} pass / ${failed} fail / ${facts.length} total`)
  } finally {
    await sql.end({ timeout: 5 })
  }

  process.exit(failed > 0 ? 1 : 0)
}

// ─── Fact factories ───────────────────────────────────────────────────

/**
 * Asserts `public.<table>` exists.
 */
export function tableExists({ schema = 'public', table }) {
  return {
    name: `table ${schema}.${table} exists`,
    async run(sql) {
      const rows = await sql`
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = ${schema} AND table_name = ${table}
      `
      const found = rows.length === 1
      return {
        passed: found,
        expected: `1 row in information_schema.tables`,
        actual: found ? 'found' : 'not found',
      }
    },
  }
}

/**
 * Asserts a set of columns each have the expected { dataType, udtName?,
 * nullable, default? }. One fact covers many columns so the probe list
 * doesn't balloon; sub-results list any column that disagreed.
 *
 * `dataType` matches information_schema.columns.data_type (e.g.
 * 'text', 'uuid', 'ARRAY', 'timestamp with time zone').
 * `udtName` matches information_schema.columns.udt_name (e.g. '_text'
 * for text[]), only checked if provided — useful for ARRAY / USER-DEFINED
 * disambiguation.
 * `nullable` is a boolean (not the 'YES'/'NO' column text).
 * `defaultContains` is a substring check against column_default (no match
 * required if null). Use it loosely — Postgres rewrites defaults so exact
 * string matches are brittle.
 */
export function columnSpecs({ schema = 'public', table, columns }) {
  return {
    name: `column specs match on ${schema}.${table} (${columns.length} columns)`,
    async run(sql) {
      const rows = await sql`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = ${schema} AND table_name = ${table}
      `
      const live = new Map(rows.map((r) => [r.column_name, r]))
      const failures = []
      for (const spec of columns) {
        const actual = live.get(spec.column)
        if (!actual) {
          failures.push(`${spec.column}: column missing from live schema`)
          continue
        }
        if (spec.dataType && actual.data_type !== spec.dataType) {
          failures.push(
            `${spec.column}: data_type expected=${spec.dataType} actual=${actual.data_type}`,
          )
        }
        if (spec.udtName && actual.udt_name !== spec.udtName) {
          failures.push(
            `${spec.column}: udt_name expected=${spec.udtName} actual=${actual.udt_name}`,
          )
        }
        if (typeof spec.nullable === 'boolean') {
          const liveNullable = actual.is_nullable === 'YES'
          if (liveNullable !== spec.nullable) {
            failures.push(
              `${spec.column}: nullable expected=${spec.nullable} actual=${liveNullable}`,
            )
          }
        }
        if (spec.defaultContains) {
          const def = actual.column_default ?? ''
          if (!def.includes(spec.defaultContains)) {
            failures.push(
              `${spec.column}: column_default should contain "${spec.defaultContains}" — actual="${def}"`,
            )
          }
        }
      }
      return {
        passed: failures.length === 0,
        expected: `${columns.length} columns matching spec`,
        actual: failures.length === 0 ? 'all match' : `${failures.length} mismatch`,
        details: failures,
      }
    },
  }
}

/**
 * Asserts a PRIMARY KEY constraint on `table` over exactly `columns`.
 */
export function primaryKey({ schema = 'public', table, columns }) {
  return {
    name: `PRIMARY KEY on ${schema}.${table}(${columns.join(', ')})`,
    async run(sql) {
      const rows = await sql`
        SELECT kcu.column_name, kcu.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          USING (constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = ${schema}
          AND tc.table_name = ${table}
        ORDER BY kcu.ordinal_position
      `
      const actual = rows.map((r) => r.column_name)
      const passed = actual.length === columns.length && actual.every((c, i) => c === columns[i])
      return {
        passed,
        expected: `[${columns.join(', ')}]`,
        actual: `[${actual.join(', ')}]`,
      }
    },
  }
}

/**
 * Asserts a UNIQUE constraint on `table` over exactly `columns` (in order).
 */
export function uniqueConstraint({ schema = 'public', table, columns, constraintName }) {
  return {
    name: `UNIQUE constraint ${constraintName} on ${schema}.${table}(${columns.join(', ')})`,
    async run(sql) {
      const rows = await sql`
        SELECT kcu.column_name, kcu.ordinal_position
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          USING (constraint_schema, constraint_name)
        WHERE tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = ${schema}
          AND tc.table_name = ${table}
          AND tc.constraint_name = ${constraintName}
        ORDER BY kcu.ordinal_position
      `
      const actual = rows.map((r) => r.column_name)
      const passed = actual.length === columns.length && actual.every((c, i) => c === columns[i])
      return {
        passed,
        expected: `[${columns.join(', ')}]`,
        actual: rows.length === 0 ? '(constraint not found)' : `[${actual.join(', ')}]`,
      }
    },
  }
}

/**
 * Asserts an index exists on `table` whose definition includes all of
 * `columnsSubstring` in order. Uses pg_indexes.indexdef textual match
 * rather than reconstructing the AST — pragmatic, good enough for
 * post-migration verification where exact DDL is committed alongside.
 */
export function indexExists({ schema = 'public', table, columnsSubstring, indexName }) {
  return {
    name: `index ${indexName ?? ''} exists on ${schema}.${table} over (${columnsSubstring.join(', ')})`,
    async run(sql) {
      const rows = indexName
        ? await sql`
            SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = ${schema} AND tablename = ${table} AND indexname = ${indexName}
          `
        : await sql`
            SELECT indexname, indexdef FROM pg_indexes
            WHERE schemaname = ${schema} AND tablename = ${table}
          `
      const pattern = columnsSubstring.join(', ')
      const match = rows.find((r) => r.indexdef.includes(`(${pattern})`))
      return {
        passed: !!match,
        expected: `index with (${pattern})`,
        actual: match
          ? match.indexname
          : rows.length === 0
          ? '(no indexes on table)'
          : `no index contains (${pattern}); found: ${rows.map((r) => r.indexname).join(', ')}`,
      }
    },
  }
}

/**
 * Asserts NO index exists on `table` whose definition matches
 * `forbiddenSubstring`. Useful to verify a deliberately-omitted index
 * (e.g., the DESC variant dropped in §8.2).
 */
export function indexAbsent({ schema = 'public', table, forbiddenSubstring, reason }) {
  return {
    name: `index absent on ${schema}.${table} matching "${forbiddenSubstring}" (${reason ?? 'intentionally omitted'})`,
    async run(sql) {
      const rows = await sql`
        SELECT indexname, indexdef FROM pg_indexes
        WHERE schemaname = ${schema} AND tablename = ${table}
      `
      const match = rows.find((r) => r.indexdef.includes(forbiddenSubstring))
      return {
        passed: !match,
        expected: `no index matching "${forbiddenSubstring}"`,
        actual: match ? `found: ${match.indexname} — ${match.indexdef}` : 'none',
      }
    },
  }
}

/**
 * Asserts a named CHECK constraint exists on `table` whose definition
 * contains `expressionSubstring`. Uses pg_constraint + pg_get_constraintdef
 * for the human-readable expression.
 */
export function checkConstraint({ schema = 'public', table, constraintName, expressionSubstring }) {
  return {
    name: `CHECK ${constraintName} on ${schema}.${table} contains "${expressionSubstring}"`,
    async run(sql) {
      const rows = await sql`
        SELECT pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE n.nspname = ${schema}
          AND t.relname = ${table}
          AND c.conname = ${constraintName}
          AND c.contype = 'c'
      `
      if (rows.length === 0) {
        return {
          passed: false,
          expected: `CHECK constraint named ${constraintName}`,
          actual: 'not found',
        }
      }
      const def = rows[0].def
      const passed = def.includes(expressionSubstring)
      return {
        passed,
        expected: `def contains "${expressionSubstring}"`,
        actual: def,
      }
    },
  }
}

/**
 * Asserts Row-Level Security is enabled on `table`.
 */
export function rlsEnabled({ schema = 'public', table }) {
  return {
    name: `RLS enabled on ${schema}.${table}`,
    async run(sql) {
      const rows = await sql`
        SELECT c.relrowsecurity
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = ${schema} AND c.relname = ${table}
      `
      if (rows.length === 0) {
        return { passed: false, expected: 'relrowsecurity=true', actual: 'table missing' }
      }
      return {
        passed: rows[0].relrowsecurity === true,
        expected: 'relrowsecurity=true',
        actual: `relrowsecurity=${rows[0].relrowsecurity}`,
      }
    },
  }
}

/**
 * Asserts a named RLS policy exists on `table` with the given command
 * ('SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL') and an expression
 * containing `expressionSubstring`. Reads via pg_policies.
 */
export function rlsPolicy({
  schema = 'public',
  table,
  policyName,
  command,
  expressionSubstring,
}) {
  return {
    name: `RLS policy ${policyName} (${command}) on ${schema}.${table} contains "${expressionSubstring}"`,
    async run(sql) {
      const rows = await sql`
        SELECT cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = ${schema} AND tablename = ${table} AND policyname = ${policyName}
      `
      if (rows.length === 0) {
        return {
          passed: false,
          expected: `policy ${policyName} exists`,
          actual: 'not found',
        }
      }
      const row = rows[0]
      if (row.cmd !== command) {
        return {
          passed: false,
          expected: `cmd=${command}`,
          actual: `cmd=${row.cmd}`,
        }
      }
      const qual = row.qual ?? ''
      const check = row.with_check ?? ''
      const bothContainIfRequired =
        (command === 'SELECT' || command === 'DELETE')
          ? qual.includes(expressionSubstring)
          : command === 'INSERT'
          ? check.includes(expressionSubstring)
          : qual.includes(expressionSubstring) && check.includes(expressionSubstring)
      return {
        passed: bothContainIfRequired,
        expected: `cmd=${command}, expr contains "${expressionSubstring}"`,
        actual: `cmd=${row.cmd}, USING=${qual || '-'}, WITH CHECK=${check || '-'}`,
      }
    },
  }
}

/**
 * Asserts a named trigger exists on `table` and calls `functionName`.
 */
export function triggerExists({ schema = 'public', table, triggerName, functionName }) {
  return {
    name: `trigger ${triggerName} on ${schema}.${table} calls ${functionName}`,
    async run(sql) {
      const rows = await sql`
        SELECT t.tgname, p.proname, np.nspname AS proc_schema
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace np ON p.pronamespace = np.oid
        WHERE n.nspname = ${schema}
          AND c.relname = ${table}
          AND t.tgname = ${triggerName}
          AND NOT t.tgisinternal
      `
      if (rows.length === 0) {
        return {
          passed: false,
          expected: `trigger ${triggerName} exists`,
          actual: 'not found',
        }
      }
      const row = rows[0]
      const qualified = `${row.proc_schema}.${row.proname}`
      const passed = qualified === functionName || row.proname === functionName.replace(/^public\./, '')
      return {
        passed,
        expected: `calls ${functionName}`,
        actual: `calls ${qualified}`,
      }
    },
  }
}

/**
 * Asserts a function exists at `schema.name` and its prosrc contains
 * `sourceSubstring` (a sanity-check that it's the right body, not
 * merely a coincidentally-named empty function).
 */
export function functionExists({ schema = 'public', name, sourceSubstring }) {
  return {
    name: `function ${schema}.${name} exists${sourceSubstring ? ` with source containing "${sourceSubstring}"` : ''}`,
    async run(sql) {
      const rows = await sql`
        SELECT prosrc
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = ${schema} AND p.proname = ${name}
      `
      if (rows.length === 0) {
        return { passed: false, expected: `function ${schema}.${name}`, actual: 'not found' }
      }
      if (sourceSubstring && !rows[0].prosrc.includes(sourceSubstring)) {
        return {
          passed: false,
          expected: `prosrc contains "${sourceSubstring}"`,
          actual: rows[0].prosrc.slice(0, 120),
        }
      }
      return { passed: true, expected: 'exists', actual: 'exists' }
    },
  }
}

/**
 * Asserts a COMMENT ON COLUMN contains `substring`.
 */
export function columnComment({ schema = 'public', table, column, substring }) {
  return {
    name: `COMMENT ON COLUMN ${schema}.${table}.${column} contains "${substring}"`,
    async run(sql) {
      const rows = await sql`
        SELECT pg_catalog.col_description(c.oid, a.attnum) AS comment
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_attribute a ON a.attrelid = c.oid
        WHERE n.nspname = ${schema}
          AND c.relname = ${table}
          AND a.attname = ${column}
          AND a.attnum > 0
      `
      if (rows.length === 0) {
        return { passed: false, expected: `column ${column} exists`, actual: 'column missing' }
      }
      const comment = rows[0].comment ?? ''
      return {
        passed: comment.includes(substring),
        expected: `comment contains "${substring}"`,
        actual: comment || '(no comment)',
      }
    },
  }
}

/**
 * Asserts a COMMENT ON FUNCTION contains `substring`.
 */
export function functionComment({ schema = 'public', name, substring }) {
  return {
    name: `COMMENT ON FUNCTION ${schema}.${name} contains "${substring}"`,
    async run(sql) {
      const rows = await sql`
        SELECT pg_catalog.obj_description(p.oid, 'pg_proc') AS comment
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = ${schema} AND p.proname = ${name}
      `
      if (rows.length === 0) {
        return { passed: false, expected: `function ${schema}.${name} exists`, actual: 'missing' }
      }
      const comment = rows[0].comment ?? ''
      return {
        passed: comment.includes(substring),
        expected: `comment contains "${substring}"`,
        actual: comment || '(no comment)',
      }
    },
  }
}
