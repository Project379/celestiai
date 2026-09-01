#!/usr/bin/env node
/**
 * Placeholder register enforcement.
 *
 * Every placeholder value, temporary stub, hardcoded fake, and deferred
 * decision in Stellaeum is one row in `.planning/PLACEHOLDERS.md`. Code
 * that carries one of them tags the site with a comment containing:
 *
 *     STELLAEUM_PLACEHOLDER: <ID>
 *
 * This gate keeps the register and the code honest with each other. It
 * exists because the previous state of the art was "grep the tree and
 * hope you remember what each TODO meant" — placeholders shipped to
 * production twice (the `REPLACE_WITH_` RevenueCat key, the malformed
 * VAPID key) before anyone noticed, because nothing connected the code
 * marker to a tracked, owned decision.
 *
 * FAILS THE BUILD when:
 *   (a) a token in code has an <ID> not in the register
 *   (b) a RESOLVED register row still has tokens in code
 *   (c) an OPEN + CODE register row with a real Location has zero tokens
 *   (d) any register row is missing Owner or Blocks ("—" counts as set)
 *
 * NOT checked (cannot be, mechanically): whether CONFIG / DECISION /
 * EXTERNAL items are actually resolved — those live in dashboards,
 * contracts, and people's heads. Rows with Location "—" are absence
 * findings (no code to mark) and are exempt from (c); rows with Location
 * "n/a" are non-CODE and exempt from (c).
 *
 * Zero cost: reads one markdown file, greps three source trees. No
 * network, no API calls. Exit 0 clean, 1 on any failure.
 * Runnable via `pnpm run check:placeholders`.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const REGISTER = resolve(ROOT, '.planning/PLACEHOLDERS.md')

// The token. Kept identical to the string documented in PLACEHOLDERS.md's
// "Marker convention" section. ID charset is A-Z 0-9 - so the capture
// stops cleanly before the " — <note>" that follows it in real markers.
const TOKEN_RE = /STELLAEUM_PLACEHOLDER:\s*([A-Z0-9-]+)/g

const VALID_TYPES = new Set(['CODE', 'CONFIG', 'DECISION', 'EXTERNAL'])
const VALID_STATUS = new Set(['OPEN', 'RESOLVED'])
const NO_LOCATION = new Set(['—', 'n/a', '', '-'])

// Source trees only. Docs (.planning/**, *.md at root) are out of scope,
// which also excludes the register itself and this script's own doc
// comment above. `scripts/check-placeholders.mjs` is excluded by name
// because it necessarily contains the token pattern.
const SCAN_GLOBS = ['apps/**', 'packages/**', 'scripts/**']
const SCAN_IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/.expo/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/ios/**',
  '**/android/**',
  '**/*.min.js',
  'scripts/check-placeholders.mjs',
]

/**
 * Parse the register table. A line is a register row iff it is a
 * pipe-table row whose Type cell is one of the four valid types AND
 * whose Status cell is OPEN/RESOLVED — this ignores every other table in
 * the document (findings, launch checklist, reconcile, numbering)
 * without needing to locate section boundaries.
 */
function parseRegister() {
  const text = readFileSync(REGISTER, 'utf8')
  const rows = []
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line.startsWith('|') || !line.endsWith('|')) continue
    const cells = line
      .slice(1, -1)
      .split('|')
      .map((c) => c.trim())
    if (cells.length !== 8) continue
    const [id, description, type, owner, blocks, status, resolvedDate, location] =
      cells
    if (!VALID_TYPES.has(type) || !VALID_STATUS.has(status)) continue
    rows.push({ id, description, type, owner, blocks, status, resolvedDate, location })
  }
  return rows
}

function scanCodeForTokens() {
  const files = fg.sync(SCAN_GLOBS, {
    cwd: ROOT,
    ignore: SCAN_IGNORE,
    dot: false,
    absolute: true,
    onlyFiles: true,
  })
  /** @type {Map<string, {file: string, line: number}[]>} */
  const byId = new Map()
  for (const abs of files) {
    let content
    try {
      content = readFileSync(abs, 'utf8')
    } catch {
      continue // unreadable / binary — nothing to match
    }
    if (!content.includes('STELLAEUM_PLACEHOLDER')) continue
    const lines = content.split(/\r?\n/)
    lines.forEach((lineText, i) => {
      let m
      TOKEN_RE.lastIndex = 0
      while ((m = TOKEN_RE.exec(lineText)) !== null) {
        const id = m[1]
        if (!byId.has(id)) byId.set(id, [])
        byId.get(id).push({ file: relative(ROOT, abs).replace(/\\/g, '/'), line: i + 1 })
      }
    })
  }
  return byId
}

function main() {
  const rows = parseRegister()
  if (rows.length === 0) {
    console.error(
      '[check-placeholders] FAIL: parsed 0 register rows from .planning/PLACEHOLDERS.md — the table format changed.',
    )
    process.exit(1)
  }
  const registerIds = new Set(rows.map((r) => r.id))
  const tokens = scanCodeForTokens()

  const failures = []

  // (a) token in code with no matching register ID
  for (const [id, hits] of tokens) {
    if (!registerIds.has(id)) {
      failures.push(
        `(a) unknown ID "${id}" — token in code with no register row:\n` +
          hits.map((h) => `      ${h.file}:${h.line}`).join('\n'),
      )
    }
  }

  // (b) RESOLVED row still has tokens
  for (const r of rows) {
    if (r.status === 'RESOLVED' && tokens.has(r.id)) {
      failures.push(
        `(b) "${r.id}" is RESOLVED but still has tokens in code:\n` +
          tokens
            .get(r.id)
            .map((h) => `      ${h.file}:${h.line}`)
            .join('\n'),
      )
    }
  }

  // (c) OPEN + CODE + real Location, but zero tokens
  for (const r of rows) {
    if (r.status !== 'OPEN' || r.type !== 'CODE') continue
    if (NO_LOCATION.has(r.location)) continue
    if (!tokens.has(r.id)) {
      failures.push(
        `(c) "${r.id}" is OPEN CODE with Location "${r.location}" but no STELLAEUM_PLACEHOLDER marker was found in code.`,
      )
    }
  }

  // (d) missing Owner or Blocks
  for (const r of rows) {
    const missing = []
    if (!r.owner || r.owner === '') missing.push('Owner')
    if (!r.blocks || r.blocks === '') missing.push('Blocks')
    if (missing.length) {
      failures.push(`(d) "${r.id}" is missing ${missing.join(' and ')}.`)
    }
  }

  const openCode = rows.filter((r) => r.status === 'OPEN' && r.type === 'CODE')
  const markable = openCode.filter((r) => !NO_LOCATION.has(r.location))
  console.log(
    `[check-placeholders] ${rows.length} register rows ` +
      `(${rows.filter((r) => r.status === 'OPEN').length} OPEN, ` +
      `${rows.filter((r) => r.status === 'RESOLVED').length} RESOLVED); ` +
      `${markable.length} OPEN CODE rows expect a marker; ` +
      `${tokens.size} distinct IDs found in code.`,
  )

  if (failures.length) {
    console.error(
      `\n[check-placeholders] FAIL: ${failures.length} problem(s).\n\n` +
        failures.map((f) => `  - ${f}`).join('\n\n') +
        `\n\nFix the register (.planning/PLACEHOLDERS.md) or the code marker, not this script.`,
    )
    process.exit(1)
  }

  console.log('[check-placeholders] PASS')
}

main()
