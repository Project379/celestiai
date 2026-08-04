#!/usr/bin/env node
/**
 * audit-schema-drift — compare Drizzle's declared schema against the
 * live Supabase Postgres schema and print every column where they
 * disagree.
 *
 * Invoke:
 *   pnpm --filter @stellaeum/web run diag:drift
 * or:
 *   node --env-file=apps/web/.env.example.local \
 *        apps/web/scripts/diagnostics/audit-schema-drift.mjs
 *
 * Why this exists: 2026-04-20 Bug-1 investigation found that
 * charts.approximate_time_range was a tstzrange in production while
 * every Drizzle migration snapshot claimed `text`. A single-column
 * silent drift is a schema-wide smell; this script walks the entire
 * Drizzle snapshot vs information_schema.columns to quantify the
 * problem before assuming it's only one column.
 *
 * Source of truth for "Drizzle-declared":
 *   packages/db/drizzle/meta/<latest>_snapshot.json
 *   (latest chosen by lexicographic sort — the four-digit prefix
 *    grows monotonically with migration number)
 *
 * Source of truth for "DB-actual":
 *   information_schema.columns in the connected Postgres database,
 *   filtered to schema='public' and to tables the Drizzle snapshot
 *   declares.
 *
 * Output format (one line per drifted column):
 *   [DRIFT]   table.column  drizzle=<type>  db=<type>
 * Output format (summary at end):
 *   TABLE T1: X columns, Y drifted
 *   TABLE T2: ...
 *   TOTAL: <drifted> drifted across <tables> tables of <columns> scanned
 *
 * Exit code: 0 if no drift, 1 if any drift.
 *
 * Requires DATABASE_URL env (Postgres direct connection string, not
 * the Supabase service-role JWT — information_schema isn't reachable
 * via the PostgREST surface that @supabase/supabase-js uses).
 */

import postgres from 'postgres'
import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// apps/web/scripts/diagnostics → ../../../packages/db/drizzle/meta
const META_DIR = join(__dirname, '..', '..', '..', '..', 'packages', 'db', 'drizzle', 'meta')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env (postgres connection string).')
  process.exit(2)
}

/**
 * Postgres information_schema.data_type values and the Drizzle type
 * names that should be considered equivalent. Keeps the drift check
 * from flagging purely cosmetic naming differences.
 *
 * Any pair NOT in this map is compared by literal string equality.
 */
const TYPE_EQUIVALENCES = new Map([
  ['character varying', ['varchar', 'character varying']],
  ['timestamp with time zone', ['timestamp with time zone']],
  ['timestamp without time zone', ['timestamp', 'timestamp without time zone']],
  ['double precision', ['double precision']],
  ['real', ['real']],
  ['integer', ['integer']],
  ['bigint', ['bigint']],
  ['smallint', ['smallint']],
  ['boolean', ['boolean']],
  ['text', ['text']],
  ['uuid', ['uuid']],
  ['jsonb', ['jsonb']],
  ['json', ['json']],
  ['date', ['date']],
  ['numeric', ['numeric']],
])

function isEquivalent(drizzleType, dbDataType, dbUdtName) {
  // Strip Drizzle array suffix "[]" for now — snapshots can carry it.
  const drizzle = drizzleType.toLowerCase().replace(/\s+/g, ' ').trim()
  const db = dbDataType.toLowerCase()
  const udt = (dbUdtName ?? '').toLowerCase()

  // USER-DEFINED covers enums, ranges, composite types — use udt_name
  // which holds the concrete type (e.g. tstzrange, int4range).
  if (db === 'user-defined') {
    return drizzle === udt
  }

  // ARRAY data_type uses udt_name with underscore prefix like _text.
  if (db === 'array') {
    const elementType = udt.replace(/^_/, '')
    return drizzle === `${elementType}[]` || drizzle === elementType
  }

  const synonyms = TYPE_EQUIVALENCES.get(db) ?? [db]
  return synonyms.includes(drizzle)
}

async function latestSnapshotPath() {
  const files = await readdir(META_DIR)
  const snapshots = files.filter((f) => /^\d{4}_snapshot\.json$/.test(f)).sort()
  if (snapshots.length === 0) {
    throw new Error(`No *_snapshot.json found under ${META_DIR}`)
  }
  return join(META_DIR, snapshots[snapshots.length - 1])
}

async function loadDrizzleSchema() {
  const path = await latestSnapshotPath()
  const raw = await readFile(path, 'utf8')
  const snapshot = JSON.parse(raw)
  const result = new Map() // table -> Map<column, { type, notNull }>
  for (const [fullTableName, tableData] of Object.entries(snapshot.tables ?? {})) {
    // Keys are "public.<name>". Strip schema prefix to match PG query.
    const tableName = fullTableName.replace(/^public\./, '')
    const cols = new Map()
    for (const [colName, colData] of Object.entries(tableData.columns ?? {})) {
      cols.set(colName, {
        type: colData.type,
        notNull: colData.notNull ?? false,
      })
    }
    result.set(tableName, cols)
  }
  return { path, tables: result }
}

async function loadDbSchema(sql, tableNames) {
  const rows = await sql`
    SELECT table_name, column_name, data_type, udt_name, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ${sql(tableNames)}
    ORDER BY table_name, ordinal_position
  `
  const result = new Map()
  for (const row of rows) {
    if (!result.has(row.table_name)) result.set(row.table_name, new Map())
    result.get(row.table_name).set(row.column_name, {
      dataType: row.data_type,
      udtName: row.udt_name,
      nullable: row.is_nullable === 'YES',
    })
  }
  return result
}

function format(table, col, drizzleType, dbType) {
  const pad = (s, n) => s.padEnd(n, ' ')
  return `${pad(`${table}.${col}`, 44)} drizzle=${pad(drizzleType, 30)} db=${dbType}`
}

async function main() {
  const sql = postgres(DATABASE_URL, { prepare: false, idle_timeout: 5, max: 2 })
  try {
    const { path: snapshotPath, tables: drizzleTables } = await loadDrizzleSchema()
    console.log(`Drizzle snapshot: ${snapshotPath}`)
    console.log(`DB: ${DATABASE_URL.replace(/:[^@/]+@/, ':***@')}`)
    console.log('')

    const tableNames = [...drizzleTables.keys()]
    if (tableNames.length === 0) {
      console.log('No tables declared in Drizzle snapshot. Nothing to audit.')
      return
    }
    const dbTables = await loadDbSchema(sql, tableNames)

    let totalScanned = 0
    let totalDrifted = 0
    const perTableStats = []

    for (const [tableName, drizzleCols] of drizzleTables) {
      const dbCols = dbTables.get(tableName)
      let tableDrifts = 0
      let tableScanned = 0

      if (!dbCols) {
        console.log(`[MISSING IN DB] table ${tableName} declared by Drizzle but not found in live DB`)
        perTableStats.push({ table: tableName, scanned: 0, drifted: 0, missing: true })
        continue
      }

      for (const [colName, declared] of drizzleCols) {
        tableScanned++
        totalScanned++
        const live = dbCols.get(colName)
        if (!live) {
          console.log(
            `[MISSING IN DB]  ${format(tableName, colName, declared.type, '(column not in live DB)')}`,
          )
          tableDrifts++
          totalDrifted++
          continue
        }
        const dbType =
          live.dataType === 'USER-DEFINED' || live.dataType === 'ARRAY'
            ? live.udtName
            : live.dataType
        if (!isEquivalent(declared.type, live.dataType, live.udtName)) {
          console.log(`[DRIFT]          ${format(tableName, colName, declared.type, dbType)}`)
          tableDrifts++
          totalDrifted++
        }
      }

      // Surface extra columns in DB that Drizzle doesn't declare.
      for (const [colName] of dbCols) {
        if (!drizzleCols.has(colName)) {
          console.log(
            `[EXTRA IN DB]    ${format(tableName, colName, '(not declared)', 'present in live DB')}`,
          )
          tableDrifts++
          totalDrifted++
        }
      }

      perTableStats.push({
        table: tableName,
        scanned: tableScanned,
        drifted: tableDrifts,
      })
    }

    console.log('')
    console.log('── per-table summary ──')
    for (const s of perTableStats) {
      if (s.missing) {
        console.log(`  ${s.table.padEnd(32, ' ')}  (missing from live DB)`)
        continue
      }
      const flag = s.drifted > 0 ? 'DRIFT' : 'ok'
      console.log(
        `  ${s.table.padEnd(32, ' ')}  ${String(s.scanned).padStart(3)} scanned, ${String(s.drifted).padStart(3)} drifted  [${flag}]`,
      )
    }
    console.log('')
    console.log(
      `TOTAL: ${totalDrifted} drifted across ${drizzleTables.size} tables (${totalScanned} columns scanned)`,
    )

    process.exit(totalDrifted > 0 ? 1 : 0)
  } finally {
    await sql.end({ timeout: 5 })
  }
}

main().catch((err) => {
  console.error('audit-schema-drift crashed:', err)
  process.exit(2)
})
