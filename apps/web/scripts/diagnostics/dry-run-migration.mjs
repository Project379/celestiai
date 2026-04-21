#!/usr/bin/env node
/**
 * dry-run-migration — apply a migration file inside a BEGIN/ROLLBACK
 * transaction against a live Postgres, then run a facts list against
 * the uncommitted state. Rollback is unconditional; nothing persists.
 *
 * Origin: §8.3 of the diary-persistence workstream. Introduced after
 * the branching path reversed when the Supabase Management API
 * enforced a Pro-plan gate on `supabase branches create` that the
 * dashboard had not surfaced. See `.planning/phases/08-diary-persistence/
 * 08-03-PREWORK.md § Branching outcome: 2-corrected` for the context.
 *
 * What this catches:
 *   - DDL parse errors (malformed SQL, wrong constraint syntax)
 *   - Constraint-definition errors (bad CHECK expressions, missing
 *     referenced functions, etc.)
 *   - Trigger creation failures (e.g., calling a function that doesn't
 *     exist or has the wrong signature)
 *   - Any of the 14/19 probe facts would-fail against the post-commit
 *     state
 *
 * What it does NOT catch:
 *   - RLS JWT-shape mismatches — policies compile fine but may reject
 *     real requests; that's §8.4 integration testing, not a DDL concern.
 *   - Data-migration correctness when existing rows transform.
 *
 * Usage:
 *   DATABASE_URL=<postgres://...> node \
 *     apps/web/scripts/diagnostics/dry-run-migration.mjs \
 *     <migration-file-path> [facts-module-path]
 *
 * Defaults:
 *   facts-module-path → ./lib/diary-facts.mjs (§8.3 diary facts)
 *
 * Exit codes:
 *   0 — DDL applied clean and all facts pass post-rollback prediction
 *   1 — DDL applied but at least one fact failed
 *   2 — DDL failed to execute (parse/semantic error), config error, or
 *       DB unreachable. The real `supabase db push` would hit the same
 *       issue. Investigate and fix before the real run.
 */

import postgres from 'postgres'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runFactsOnClient } from './lib/schema-probe.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const ROLLBACK_SENTINEL = '__DRY_RUN_ROLLBACK__'

const args = process.argv.slice(2)
const migrationArg = args[0]
const factsModuleArg = args[1]

if (!migrationArg) {
  console.error(
    'Usage: dry-run-migration.mjs <migration-file-path> [facts-module-path]',
  )
  process.exit(2)
}

const migrationPath = resolve(process.cwd(), migrationArg)
const factsModulePath = factsModuleArg
  ? resolve(process.cwd(), factsModuleArg)
  : resolve(__dirname, 'lib/diary-facts.mjs')

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL env (postgres connection string).')
  process.exit(2)
}

async function main() {
  // Read migration + facts up front so config errors surface before
  // we touch the DB.
  let migrationSql
  try {
    migrationSql = await readFile(migrationPath, 'utf8')
  } catch (err) {
    console.error(`Could not read migration file ${migrationPath}: ${err.message}`)
    process.exit(2)
  }

  let factsModule
  try {
    factsModule = await import(pathToFileURL(factsModulePath).href)
  } catch (err) {
    console.error(`Could not load facts module ${factsModulePath}: ${err.message}`)
    process.exit(2)
  }
  const facts = factsModule.FACTS
  if (!Array.isArray(facts) || facts.length === 0) {
    console.error(`Facts module at ${factsModulePath} must export a non-empty FACTS array.`)
    process.exit(2)
  }

  const sql = postgres(DATABASE_URL, { prepare: false, idle_timeout: 5, max: 2 })

  console.log('dry-run-migration')
  console.log(`migration: ${migrationPath}`)
  console.log(`facts:     ${factsModulePath} (${facts.length} facts)`)
  console.log(`DB:        ${DATABASE_URL.replace(/:[^@/]+@/, ':***@')}`)
  console.log('')

  let exitCode = 2
  let transactionErrored = false
  let transactionError = null

  try {
    try {
      await sql.begin(async (txn) => {
        console.log('── applying migration inside BEGIN/ROLLBACK transaction ──')
        await txn.unsafe(migrationSql)
        console.log('migration DDL applied inside transaction. Running facts probe...')
        console.log('')

        const probeResult = await runFactsOnClient({
          sql: txn,
          facts,
          label: 'dry-run probe (in-transaction, pre-rollback)',
        })

        // Force rollback by throwing a sentinel error. postgres.js's
        // sql.begin rolls back on any throw. We stash probeResult on
        // the error so main() can read it out.
        const sentinel = new Error(ROLLBACK_SENTINEL)
        sentinel.probeResult = probeResult
        throw sentinel
      })
      // sql.begin returned without our sentinel throwing — means the
      // transaction committed somehow. That would be a bug in this
      // script or postgres.js. Fail loud.
      console.error('')
      console.error('UNEXPECTED: dry-run transaction completed without ROLLBACK sentinel.')
      console.error('This is a script bug, not a migration result. Exiting with code 2.')
      exitCode = 2
    } catch (err) {
      if (err?.message === ROLLBACK_SENTINEL) {
        // Expected path: rollback triggered after facts ran.
        const { probeResult } = err
        console.log('')
        console.log('── transaction rolled back. No DB state persisted. ──')
        exitCode = probeResult.failed > 0 ? 1 : 0
      } else {
        // Unexpected: migration DDL itself errored.
        transactionErrored = true
        transactionError = err
        exitCode = 2
      }
    }
  } finally {
    await sql.end({ timeout: 5 })
  }

  if (transactionErrored) {
    const err = transactionError
    console.error('')
    console.error('── dry-run FAILED during migration execution ──')
    console.error(`error:    ${err.message}`)
    if (err.code) console.error(`code:     ${err.code}`)
    if (err.severity) console.error(`severity: ${err.severity}`)
    if (err.hint) console.error(`hint:     ${err.hint}`)
    if (err.position) console.error(`position: char ${err.position} of migration`)
    if (err.where) console.error(`where:    ${err.where}`)
    console.error('')
    console.error('The real `supabase db push` would hit the same error.')
    console.error('Investigate and fix the migration before re-running.')
  }

  process.exit(exitCode)
}

main().catch((err) => {
  console.error('dry-run crashed:', err)
  process.exit(2)
})
