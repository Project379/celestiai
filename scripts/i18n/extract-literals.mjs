// Shared Cyrillic string-literal extraction — used by both
// check-bg-static-strings.mjs (spelling) and the approved-copy lock
// (generate-copy-lock.mjs / check-copy-lock.mjs). One extraction pass,
// not duplicated per consumer.
import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import fg from 'fast-glob'

const GLOBS = ['apps/mobile/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}']
// Test files are scope, not content — a Cyrillic literal in a *.test.ts
// fixture is test data, not product copy. Kept in sync with
// packages/config/eslint/no-new-bg-strings.cjs's TEST_IGNORE_GLOBS (same
// exclusion, enforced by a different mechanism there — ESLint `ignores`
// vs. fast-glob `ignore` — so it isn't literally shared code, but must
// stay the same set of files).
const IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/build/**',
  '**/.expo/**',
  '**/test/**',
  '**/__tests__/**',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

const CYRILLIC_RE = /[Ѐ-ӿ]/
const STRING_LITERAL_RE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g

function stripComments(source) {
  // Negative lookbehind on ':' — without it, the `//` inside a string literal
  // like 'https://example.com' reads as a line-comment start and eats the
  // rest of that line, including the literal's closing quote. That desyncs
  // quote-matching for every literal extracted later in the file (surfaced
  // by REVISIT-53: apps/mobile/.../you/settings.tsx's PRIVACY_URL constant).
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/[^\n]*/g, '')
}

function lineNumberAt(source, index) {
  let line = 1
  for (let i = 0; i < index; i++) if (source[i] === '\n') line++
  return line
}

/**
 * Returns every Cyrillic-containing string/template literal in the source
 * tree as { file, line, text }, sorted by file then line — a stable order
 * so snapshot diffs are readable and don't reorder on every run.
 */
export async function extractAllLiterals(root) {
  const files = await fg(GLOBS, { cwd: root, ignore: IGNORE, absolute: true })
  const results = []

  for (const file of files) {
    // Normalize CRLF -> LF before anything else. Git stores (and Linux CI
    // checks out) LF; a Windows checkout with core.autocrlf=true silently
    // converts working-tree files to CRLF regardless of a .gitattributes
    // eol=lf rule (git skips re-writing files whose blob content hasn't
    // changed, even after the attribute is added) — invisible for most
    // tooling, but a real bug here: a multi-line template literal's
    // extracted text differs by the presence of \r, so a copy-lock
    // snapshot generated on a CRLF working tree doesn't match what CI
    // extracts from the true LF-committed content. Found 2026-08-04 when
    // a local check:all pass didn't reproduce on CI. Normalizing here
    // makes extraction identical regardless of any contributor's local
    // line-ending state, independent of relying on everyone's git config.
    const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
    const stripped = stripComments(raw)
    let match
    while ((match = STRING_LITERAL_RE.exec(stripped))) {
      const literal = match[0]
      if (!CYRILLIC_RE.test(literal)) continue
      results.push({
        file: relative(root, file).replace(/\\/g, '/'),
        line: lineNumberAt(stripped, match.index),
        text: literal,
      })
    }
  }

  results.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)))
  return results
}
