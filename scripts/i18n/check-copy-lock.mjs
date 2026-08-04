#!/usr/bin/env node
/**
 * Approved-copy lock check. Compares the current tree's Cyrillic literals
 * against scripts/i18n/copy-lock.json (keyed by file+text, counted —
 * see generate-copy-lock.mjs for why not file+line). Fails when they
 * differ — added, removed, or changed copy that hasn't been re-approved
 * by regenerating the lock.
 *
 * Exit 0 on match, 1 on drift. Runnable via `pnpm run check:copy-lock`.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAllLiterals } from './extract-literals.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const LOCK_PATH = resolve(__dirname, 'copy-lock.json')

function toCounts(entries) {
  const counts = new Map()
  for (const e of entries) counts.set(e, (counts.get(e) ?? 0) + 1)
  return counts
}

if (!existsSync(LOCK_PATH)) {
  console.error('[check-copy-lock] No copy-lock.json found. Run: node scripts/i18n/generate-copy-lock.mjs')
  process.exit(1)
}

const locked = JSON.parse(readFileSync(LOCK_PATH, 'utf8'))
const lockedCounts = toCounts(locked.entries)

const literals = await extractAllLiterals(ROOT)
const currentEntries = literals.map(({ file, text }) => `${file}::${text}`)
const currentCounts = toCounts(currentEntries)

const added = []
const removed = []

for (const [entry, count] of currentCounts) {
  const before = lockedCounts.get(entry) ?? 0
  if (count > before) added.push(count - before > 1 ? `${entry}  (×${count - before})` : entry)
}
for (const [entry, count] of lockedCounts) {
  const after = currentCounts.get(entry) ?? 0
  if (count > after) removed.push(count - after > 1 ? `${entry}  (×${count - after})` : entry)
}

if (added.length === 0 && removed.length === 0) {
  console.log(`[check-copy-lock] PASS: ${literals.length} Cyrillic literal(s) match the approved snapshot`)
  process.exit(0)
}

console.error('[check-copy-lock] FAIL: Bulgarian copy has changed since the last approved snapshot\n')
if (added.length > 0) {
  console.error(`${added.length} new/changed:`)
  for (const e of added) console.error(`  + ${e}`)
}
if (removed.length > 0) {
  console.error(`${removed.length} removed:`)
  for (const e of removed) console.error(`  - ${e}`)
}
console.error(
  '\nIf this change is intentional, run `node scripts/i18n/generate-copy-lock.mjs` and commit the updated copy-lock.json to approve it.'
)
process.exit(1)
