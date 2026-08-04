#!/usr/bin/env node
/**
 * CI check — spell-checks every hardcoded Bulgarian (Cyrillic) string
 * literal in the source tree against `dictionary-bg`. Catches real
 * non-words (typos, garbled text) in STATIC strings only — see
 * scripts/i18n/bg-speller.mjs's header for what this cannot catch
 * (register, calques, translated-feel syntax — that stays a human review).
 *
 * Scope: apps/mobile, apps/web, packages — .ts/.tsx files, excluding
 * node_modules/.next/dist/build. Comments are stripped (best-effort regex,
 * not a full parser) before extracting string/template literals, so
 * developer-facing Bulgarian in code comments doesn't get flagged.
 *
 * Exit 0 on pass (no misspellings), 1 on fail. Runnable via
 * `pnpm run check:bg-strings`.
 */
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSpeller, findMisspellings } from './i18n/bg-speller.mjs'
import { extractAllLiterals } from './i18n/extract-literals.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

async function main() {
  const speller = await loadSpeller()
  const literals = await extractAllLiterals(ROOT)

  const failures = []

  for (const { file, line, text } of literals) {
    const misses = findMisspellings(speller, text)
    if (misses.length === 0) continue
    failures.push({
      file,
      line,
      words: misses,
      snippet: text.length > 90 ? text.slice(0, 90) + '…' : text,
    })
  }

  if (failures.length === 0) {
    console.log('[check-bg-strings] PASS: no unrecognized Bulgarian words in static strings')
    process.exit(0)
  }

  console.error(`[check-bg-strings] FAIL: ${failures.length} string(s) with unrecognized word(s)\n`)
  for (const f of failures) {
    console.error(`${f.file}:${f.line}`)
    console.error(`  word(s): ${f.words.join(', ')}`)
    console.error(`  string:  ${f.snippet}`)
    console.error('')
  }
  process.exit(1)
}

main().catch((err) => {
  console.error('[check-bg-strings] ERROR:', err)
  process.exit(1)
})
