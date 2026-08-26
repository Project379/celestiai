#!/usr/bin/env node
/**
 * Error-code collision check.
 *
 * 2026-08-26: the Tier 1 sweep fix accidentally reused 'ERR-BD-005' —
 * already claimed by GET /api/birth-data/[id] for an unrelated condition
 * — for the new chart-limit 429 in POST /api/birth-data. TypeScript
 * couldn't catch it: ServerErrorCode in
 * apps/web/lib/monitoring/log-server-error.ts is a typed union, but it
 * only gets checked when code actually calls logServerError(code, ...).
 * The colliding code was written as a bare string literal straight into
 * a Response.json({ code: 'ERR-BD-005' }) call, never passing through
 * logServerError, so nothing ever cross-referenced it against the
 * registry. Caught by hand while wiring up an unrelated fix, not by any
 * gate — this script is that gate.
 *
 * What it can't catch: whether two USES of the same code in the same
 * file are semantically the same condition or two different ones written
 * by the same author on purpose (a judgment call). What it CAN catch,
 * mechanically: the exact shape that caused the incident above — a code
 * string reused across DIFFERENT files, which is the collision case that
 * actually matters (two independently-written error paths converging on
 * one code by accident). A code repeated many times within one file
 * (the common, intentional case — a shared fallback message reused at
 * several call sites in the same route) is not flagged.
 *
 * Exit 0 on no collisions, 1 on any code appearing in more than one file.
 * Runnable via `pnpm run check:error-codes`.
 */
import { readFileSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Scoped to ORIGINATION points only — where a code is asserted as an
// error's identity (a Response.json({ code: '...' }) or a
// logServerError('...', ...) call inside a route handler). Deliberately
// NOT the whole codebase: a code fans out intentionally into
// lib/monitoring/log-server-error.ts's registry, log-client-error.ts's
// mirror, and both platforms' hooks (apps/web + apps/mobile
// useManifestEntries.ts, which legitimately share codes across web and
// mobile for the same server condition) — scanning those produces one
// "collision" per code, every code, which is noise, not signal. The
// actual incident this script exists for (ERR-BD-005 reused across two
// DIFFERENT route.ts files for two different conditions) only involves
// route handlers.
// Mobile has no origination sites today (grep-confirmed 2026-08-26: zero
// ERR-XX-NNN matches under apps/mobile/app) — it only ever displays codes
// received in API responses, never asserts one itself. If that changes,
// add its origination path here.
const GLOBS = ['apps/web/app/api/**/route.ts']
const IGNORE = ['**/node_modules/**', '**/.next/**']

// ERR-XX-NNN — two-letter domain, three-digit number. Matches the pattern
// already established across ERR-BD-*, ERR-DI-* in the codebase.
const ERROR_CODE_RE = /\bERR-[A-Z]{2}-\d{3}\b/g

// Comments can legitimately mention another file's code for documentation
// (e.g. "ERR-BD-005 is already used by ... for an unrelated condition") —
// that's not an origination, just prose. Only actual code should count.
// Same negative-lookbehind-on-':' guard as extract-literals.mjs's
// stripComments, for the same reason (a literal containing "://" must not
// be treated as a line-comment start).
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(?<!:)\/\/[^\n]*/g, '')
}

async function main() {
  const files = await fg(GLOBS, { cwd: ROOT, ignore: IGNORE, absolute: true })

  /** @type {Map<string, Set<string>>} code -> set of relative file paths */
  const codeToFiles = new Map()

  for (const file of files) {
    const source = stripComments(readFileSync(file, 'utf8'))
    const matches = source.match(ERROR_CODE_RE)
    if (!matches) continue

    const relPath = relative(ROOT, file).replace(/\\/g, '/')
    for (const code of matches) {
      if (!codeToFiles.has(code)) codeToFiles.set(code, new Set())
      codeToFiles.get(code).add(relPath)
    }
  }

  const collisions = [...codeToFiles.entries()]
    .filter(([, fileSet]) => fileSet.size > 1)
    .sort(([a], [b]) => a.localeCompare(b))

  if (collisions.length > 0) {
    console.error(`[check-error-code-collisions] FAIL: ${collisions.length} error code(s) used in more than one file:\n`)
    for (const [code, fileSet] of collisions) {
      console.error(`  ${code}`)
      for (const f of [...fileSet].sort()) console.error(`    ${f}`)
    }
    console.error(
      '\nEach ERR-XX-NNN code must mean exactly one thing. If these are genuinely the same condition shared across files, that is fine — rename to make the sharing intentional and obvious (or route both through the same helper). If they are two different conditions that happened to pick the same number, give one of them a new code.',
    )
    process.exit(1)
  }

  console.log(`[check-error-code-collisions] PASS: ${codeToFiles.size} error code(s), no cross-file collisions`)
  process.exit(0)
}

main()
