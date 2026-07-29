#!/usr/bin/env node
/**
 * Approved-copy lock — Stage 5 prevention mechanism (register-conversion
 * workstream, 2026-07-30). Snapshots every Cyrillic string/template literal
 * in the source tree into scripts/i18n/copy-lock.json. check-copy-lock.mjs
 * fails CI when the current tree's literals differ from this snapshot,
 * forcing a human to notice a Bulgarian-copy change and re-run this script
 * (re-approving it) rather than have it drift silently through an
 * unrelated refactor.
 *
 * This does NOT judge whether copy is good Bulgarian — that's still a
 * human call, same as everything else in this i18n workstream. It only
 * forces the change to be seen.
 *
 * Keyed by file + literal text, NOT file + line number: a line-number key
 * would make every literal below an unrelated one-line edit (a new import,
 * a comment) register as a spurious remove+add, even though no copy
 * changed. Duplicate identical strings within one file are tracked by
 * count, not collapsed.
 *
 * Run whenever you deliberately add/edit/remove Bulgarian copy, then
 * commit the updated copy-lock.json alongside your change.
 *
 * Usage: node scripts/i18n/generate-copy-lock.mjs
 */
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractAllLiterals } from './extract-literals.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const LOCK_PATH = resolve(__dirname, 'copy-lock.json')

const literals = await extractAllLiterals(ROOT)

// No timestamp field: a timestamp would make every regeneration produce a
// diff even with zero copy changes, defeating the point of a content-based
// lock. Git blame on this file is the timestamp.
const lock = {
  count: literals.length,
  entries: literals.map(({ file, text }) => `${file}::${text}`).sort(),
}

writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 2) + '\n', 'utf8')
console.log(`[copy-lock] Wrote ${literals.length} entries to ${LOCK_PATH}`)
