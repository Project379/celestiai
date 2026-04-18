#!/usr/bin/env node
/**
 * Enforces that packages/core/tsconfig.json either:
 *   (a) has "noUncheckedIndexedAccess": true, OR
 *   (b) contains a `// STRICTNESS_DEFERRED: <https-url>` marker pointing to
 *       an open tracking issue.
 *
 * Prevents silent re-relaxation of the flag. Any future relaxation must
 * attach a tracking issue the regex below recognizes.
 *
 * Exit 0 on pass, 1 on fail. Runnable via `pnpm run check:strictness`.
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TSCONFIG_PATH = resolve(__dirname, '..', 'packages', 'core', 'tsconfig.json')

const raw = readFileSync(TSCONFIG_PATH, 'utf8')

// Strip // line comments for JSON parsing, but keep the raw text for marker search.
const stripped = raw.replace(/\/\/[^\n]*/g, '')
const parsed = JSON.parse(stripped)
const flag = parsed?.compilerOptions?.noUncheckedIndexedAccess

if (flag === true) {
  console.log('[check-core-strictness] PASS: noUncheckedIndexedAccess=true')
  process.exit(0)
}

// Require STRICTNESS_DEFERRED marker pointing to an https URL.
// Explicitly reject placeholders like /issues/TODO or /issues/0.
const markerRegex = /STRICTNESS_DEFERRED:\s*(https:\/\/\S+)/
const match = raw.match(markerRegex)

if (!match) {
  console.error('[check-core-strictness] FAIL:')
  console.error('  packages/core/tsconfig.json has noUncheckedIndexedAccess !== true')
  console.error('  and no `// STRICTNESS_DEFERRED: <https-url>` marker was found.')
  console.error('  Either re-enable the flag or add the marker with a real issue URL.')
  process.exit(1)
}

const url = match[1]
if (/\/(TODO|0|xxx|placeholder)\b/i.test(url)) {
  console.error('[check-core-strictness] FAIL:')
  console.error(`  STRICTNESS_DEFERRED marker has a placeholder URL: ${url}`)
  console.error('  Create the tracking issue and update the URL.')
  process.exit(1)
}

console.log(`[check-core-strictness] PASS: deferred with tracking issue ${url}`)
process.exit(0)
