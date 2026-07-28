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
import { readFileSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'
import { loadSpeller, findMisspellings } from './i18n/bg-speller.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

const GLOBS = ['apps/mobile/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}']
const IGNORE = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.expo/**']

const CYRILLIC_RE = /[Ѐ-ӿ]/
const STRING_LITERAL_RE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g

function stripComments(source) {
  // Best-effort: block comments, then line comments. Doesn't understand
  // strings containing `//` or `/*` — acceptable for a first-pass tool,
  // rare enough in this codebase's actual string content to not matter
  // in practice (checked against the known inventory: no false negatives
  // observed from this on the current tree).
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
}

function lineNumberAt(source, index) {
  let line = 1
  for (let i = 0; i < index; i++) if (source[i] === '\n') line++
  return line
}

async function main() {
  const speller = await loadSpeller()
  const files = await fg(GLOBS, { cwd: ROOT, ignore: IGNORE, absolute: true })

  const failures = []

  for (const file of files) {
    const raw = readFileSync(file, 'utf8')
    const stripped = stripComments(raw)
    let match
    while ((match = STRING_LITERAL_RE.exec(stripped))) {
      const literal = match[0]
      if (!CYRILLIC_RE.test(literal)) continue
      const misses = findMisspellings(speller, literal)
      if (misses.length === 0) continue
      const line = lineNumberAt(stripped, match.index)
      failures.push({
        file: relative(ROOT, file),
        line,
        words: misses,
        snippet: literal.length > 90 ? literal.slice(0, 90) + '…' : literal,
      })
    }
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
