#!/usr/bin/env node
/**
 * check:rpc-contract — every `.rpc('name', { args })` call site must match the
 * newest CREATE FUNCTION for `name` in supabase/migrations (name exists; argument
 * names are a subset of the parameters; every parameter without a DEFAULT is
 * passed). Static: no database, no network. See scripts/lib/rpc-contract.mjs and
 * .planning/VERIFICATION-SURFACE-GAPS.md §14 for why this exists.
 *
 * Exit 0 clean, 1 on any mismatch. `pnpm run check:rpc-contract`.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { checkContract, parseFunctions, parseRpcCalls } from './lib/rpc-contract.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(resolve(ROOT, 'package.json'))
const fg = require('fast-glob')

const migrationsDir = resolve(ROOT, 'supabase/migrations')
const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort() // timestamp-prefixed: lexical order == apply order
  .map((f) => ({ file: `supabase/migrations/${f}`, sql: readFileSync(resolve(migrationsDir, f), 'utf8') }))
const functions = parseFunctions(migrations)

const files = await fg(['apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'], {
  cwd: ROOT,
  absolute: true,
  ignore: ['**/node_modules/**', '**/.next/**', '**/.expo/**', '**/dist/**', '**/test/**', '**/__tests__/**', '**/*.test.ts', '**/*.test.tsx'],
})

const calls = []
for (const f of files) {
  const src = readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
  if (!src.includes('.rpc(')) continue
  calls.push(...parseRpcCalls(src, relative(ROOT, f).replace(/\\/g, '/')))
}

const { violations, skipped } = checkContract(functions, calls)

console.log(`[check-rpc-contract] ${calls.length} .rpc() call site(s) checked against ${functions.size} migration function(s)`)
for (const s of skipped) console.log(`  skipped (not statically readable): ${s}`)
if (violations.length) {
  console.error('\n[check-rpc-contract] FAIL')
  for (const v of violations) console.error('  ✗ ' + v)
  process.exit(1)
}
console.log('[check-rpc-contract] PASS')
