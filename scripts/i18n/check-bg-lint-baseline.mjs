#!/usr/bin/env node
/**
 * Enforces the no-new-bg-strings lint rule (packages/config/eslint/
 * no-new-bg-strings.cjs) as a ratcheting baseline: fails only if the
 * count of "Cyrillic literal outside a content-home file" warnings
 * INCREASES beyond BASELINE. Existing debt is grandfathered; new
 * instances are not.
 *
 * Deliberately NOT a blanket `eslint --max-warnings` on each workspace's
 * full lint script — that would conflate this rule's count with
 * unrelated pre-existing warnings (react-hooks/exhaustive-deps, a11y,
 * etc.), making the ceiling meaningless. This counts only
 * no-restricted-syntax violations (which is currently used only for this
 * rule) via ESLint's JSON formatter, summed across all three workspaces.
 *
 * BASELINE recorded 2026-07-30: 1336 (51 packages/core, 752 apps/web,
 * 533 apps/mobile). Originally measured at 1338 the same day, but the
 * cron-endpoint fix (Сесията ти изтече -> plain English 'Unauthorized'
 * for the two CRON_SECRET-guarded, non-user-facing endpoints — see the
 * "Scope note" in STAGE5_PREVENTION.md) removed 2 Cyrillic literals
 * before this baseline was locked in, so it reflects that already rather
 * than starting 2 wider than necessary. See STAGE5_PREVENTION.md for the
 * full writeup. As the namespaced strings-module migration proceeds and
 * literals move out of components into that module, this number should
 * drop — lower BASELINE to match and get a visible "progress, not noise"
 * signal, per the founder's instruction.
 *
 * Usage: node scripts/i18n/check-bg-lint-baseline.mjs
 */
import { execFileSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')

const BASELINE = 1336

const WORKSPACES = [
  { name: '@stellaeum/core', dir: 'packages/core', target: 'src' },
  { name: '@stellaeum/web', dir: 'apps/web', target: '.' },
  { name: '@stellaeum/mobile', dir: 'apps/mobile', target: '.' },
]

function countViolations(workspace) {
  const cwd = resolve(ROOT, workspace.dir)
  let stdout
  try {
    stdout = execFileSync('npx', ['eslint', workspace.target, '--no-cache', '-f', 'json'], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      // Windows resolves `npx` via npx.cmd — execFileSync needs shell:true
      // to find it; without it, spawn fails with ENOENT rather than
      // running eslint. Harmless on POSIX where npx is a direct binary.
      shell: true,
    })
  } catch (err) {
    // eslint exits non-zero when it finds any error/warning — that's
    // expected here (this repo has pre-existing warnings/errors from
    // other rules); stdout still has the JSON report.
    stdout = err.stdout ?? ''
  }

  let results
  try {
    results = JSON.parse(stdout)
  } catch {
    console.error(`[check-bg-lint-baseline] Failed to parse ESLint JSON output for ${workspace.name}`)
    console.error(stdout.slice(0, 2000))
    process.exit(1)
  }

  let count = 0
  const files = []
  for (const file of results) {
    const matches = file.messages.filter((m) => m.ruleId === 'no-restricted-syntax')
    if (matches.length > 0) {
      count += matches.length
      files.push({ path: file.filePath, count: matches.length })
    }
  }
  return { count, files }
}

let total = 0
const perWorkspace = []
for (const ws of WORKSPACES) {
  const { count } = countViolations(ws)
  perWorkspace.push({ name: ws.name, count })
  total += count
}

console.log('[check-bg-lint-baseline] Cyrillic-outside-content-home literal counts:')
for (const { name, count } of perWorkspace) {
  console.log(`  ${name.padEnd(20)} ${count}`)
}
console.log(`  ${'TOTAL'.padEnd(20)} ${total}  (baseline: ${BASELINE})`)

if (total > BASELINE) {
  console.error(
    `\n[check-bg-lint-baseline] FAIL: ${total} > baseline ${BASELINE}. A new Cyrillic literal landed outside an established content-home file.`
  )
  console.error(
    'Either move the new copy into a content-home file / the namespaced strings module, or confirm the file IS a content home and add it to CONTENT_HOME_GLOBS in packages/config/eslint/no-new-bg-strings.cjs.'
  )
  process.exit(1)
}

if (total < BASELINE) {
  console.log(
    `\n[check-bg-lint-baseline] Count dropped below baseline (${total} < ${BASELINE}) — progress! Lower BASELINE in this script to lock it in.`
  )
}

console.log('\n[check-bg-lint-baseline] PASS')
process.exit(0)
