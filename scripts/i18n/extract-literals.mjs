// Shared Cyrillic string-literal extraction — used by both
// check-bg-static-strings.mjs (spelling) and the approved-copy lock
// (generate-copy-lock.mjs / check-copy-lock.mjs). One extraction pass,
// not duplicated per consumer.
import { readFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import fg from 'fast-glob'

const GLOBS = ['apps/mobile/**/*.{ts,tsx}', 'apps/web/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}']
const IGNORE = ['**/node_modules/**', '**/.next/**', '**/dist/**', '**/build/**', '**/.expo/**']

const CYRILLIC_RE = /[Ѐ-ӿ]/
const STRING_LITERAL_RE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
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
    const raw = readFileSync(file, 'utf8')
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
