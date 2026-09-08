#!/usr/bin/env node
/**
 * Environment-variable consistency gate.
 *
 * 2026-09-07: two env-var drift bugs shipped in one week.
 *   1. `turbo.json` build.env listed `OPENROUTER_API_KEY` for months after
 *      the code switched to `process.env.GEMINI_API_KEY` (the provider
 *      swap landed 2026-09-05). The stale entry named a variable nothing
 *      read; the variable the build actually needed was absent.
 *   2. The Supabase key rename (`SUPABASE_SERVICE_ROLE_KEY` ->
 *      `SUPABASE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` ->
 *      `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) had to land in three files
 *      that must agree — code, `turbo.json`, `.env.example` — and a
 *      trailing-`S` typo (`..._KEYS`) in the deploy environment went
 *      undetected because nothing cross-referenced the names.
 *
 * TypeScript can't catch either: `process.env.X` is `string | undefined`
 * for any `X`, and `turbo.json` / `.env.example` are not typed at all.
 * This script is that cross-reference.
 *
 * It fails when a variable is:
 *   (a) read via `process.env.X` in first-party code but declared in
 *       NEITHER `turbo.json` (build.env / globalPassThroughEnv) NOR the
 *       relevant `.env.example` — the shape of bug #1's "needed but
 *       absent" half and of any undeclared runtime var;
 *   (b) declared in `turbo.json`'s build.env but read nowhere in
 *       first-party code — the shape of bug #1's "stale entry" half;
 *   (c) named such that a near-identical variable (trailing `S`,
 *       `NEXT_PUBLIC_` prefix drift, edit-distance 1) appears on a
 *       different surface — the shape of bug #2's typo.
 *
 * Documented exceptions from turbo.json's "//" comment are encoded as
 * explicit ALLOWLIST entries below with their reason, not silent skips.
 *
 * Zero cost, no network. Exit 0 clean, 1 on any violation.
 * Runnable via `pnpm run check:env-consistency`.
 */
import { readFileSync } from 'node:fs'
import { resolve, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fg from 'fast-glob'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/')

// ---------------------------------------------------------------------------
// Allowlist — variables intentionally NOT subject to one or more rules.
// Every entry carries the reason it is exempt. `rules` lists which checks
// it opts out of: 'undeclared' (rule a), 'unread' (rule b). Rule (c) —
// naming near-miss — always runs; a typo is never intentional.
// ---------------------------------------------------------------------------
const ALLOWLIST = [
  {
    match: (name) => name.startsWith('NEXT_PUBLIC_'),
    rules: ['undeclared', 'unread'],
    reason:
      "Turbo's Next.js framework inference already includes NEXT_PUBLIC_* for @stellaeum/web#build (see turbo.json '//' comment). It is deliberately NOT listed in turbo.json. It must still appear in apps/web/.env.example — that is checked separately below.",
  },
  {
    match: (name) => name.startsWith('EXPO_PUBLIC_'),
    rules: ['undeclared', 'unread'],
    reason:
      'apps/mobile has no turbo build task, so EXPO_PUBLIC_* belongs in neither build.env nor globalPassThroughEnv. It must still appear in apps/mobile/.env.example — checked separately below.',
  },
  {
    match: (name) => name.startsWith('UAT_'),
    rules: ['undeclared', 'unread'],
    reason:
      'Test/UAT-harness only (apps/web/scripts/m3-uat-harness.mjs). Never a deploy variable; not expected in turbo.json or any .env.example.',
  },
  {
    match: (name) =>
      name === 'SMOKE_BASE_URL' || name === 'SMOKE_EXPECTED_SHA' || name === 'SMOKE_SKIP_AI',
    rules: ['undeclared', 'unread'],
    reason:
      'Post-deploy smoke runner only (scripts/smoke.mjs, wired in .github/workflows/smoke.yml from deployment_status context + repo vars). CI-runner env, never a Vercel deploy variable — not expected in turbo.json or any .env.example. NB: SMOKE_SECRET is NOT here — it IS a deploy variable (read by apps/web/app/api/smoke/route.ts) and is declared in globalPassThroughEnv + apps/web/.env.example.',
  },
  {
    match: (name) =>
      name === 'NODE_ENV' ||
      name === 'NEXT_RUNTIME' ||
      name === 'CI' ||
      name === 'GITHUB_ACTIONS',
    rules: ['undeclared', 'unread'],
    reason: 'Platform/framework built-in, set by the runtime, never declared by us.',
  },
]

const allowEntry = (name) => ALLOWLIST.find((e) => e.match(name))
const isAllowed = (name, rule) => {
  const e = allowEntry(name)
  return e ? e.rules.includes(rule) : false
}

// ---------------------------------------------------------------------------
// 1. Collect process.env.* reads from first-party code.
// ---------------------------------------------------------------------------
const CODE_GLOBS = [
  'apps/web/app/**/*.{ts,tsx}',
  'apps/web/lib/**/*.{ts,tsx}',
  'apps/web/components/**/*.{ts,tsx}',
  'apps/web/middleware.ts',
  'apps/web/instrumentation.ts',
  'apps/web/instrumentation-client.ts',
  'apps/web/sentry.server.config.ts',
  'apps/web/sentry.edge.config.ts',
  'apps/web/next.config.{ts,mjs,js}',
  'apps/web/scripts/**/*.{ts,mjs,js}',
  'apps/mobile/app/**/*.{ts,tsx}',
  'apps/mobile/lib/**/*.{ts,tsx}',
  'apps/mobile/components/**/*.{ts,tsx}',
  'apps/mobile/hooks/**/*.{ts,tsx}',
  'apps/mobile/src/**/*.{ts,tsx}',
  'packages/*/src/**/*.{ts,tsx}',
  'scripts/**/*.mjs',
]
const CODE_IGNORE = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/.expo/**',
  '**/*.test.{ts,tsx}',
  '**/test/**',
  '**/__tests__/**',
  // this script names variables in prose only
  'scripts/check-env-consistency.mjs',
]

const READ_RE = /process\.env\.([A-Z_][A-Z0-9_]*)/g

/** @type {Map<string, string[]>} var -> sorted unique file list */
const reads = new Map()
for (const file of await fg(CODE_GLOBS, { cwd: ROOT, ignore: CODE_IGNORE, absolute: true })) {
  const src = readFileSync(file, 'utf8')
  let m
  while ((m = READ_RE.exec(src)) !== null) {
    const name = m[1]
    if (!reads.has(name)) reads.set(name, new Set())
    reads.get(name).add(rel(file))
  }
}
for (const [k, v] of reads) reads.set(k, [...v].sort())

// ---------------------------------------------------------------------------
// 2. Collect declarations.
// ---------------------------------------------------------------------------
const turbo = JSON.parse(readFileSync(resolve(ROOT, 'turbo.json'), 'utf8'))
const buildEnv = new Set(turbo.tasks?.build?.env ?? [])
const passThrough = new Set(turbo.globalPassThroughEnv ?? [])

function parseEnvExample(path) {
  const out = new Set()
  let text
  try {
    text = readFileSync(resolve(ROOT, path), 'utf8')
  } catch {
    return out
  }
  for (const line of text.split('\n')) {
    // Both `FOO=...` and a deliberately commented `# FOO=...` count as
    // declared. A commented entry is the correct .env.example form for an
    // optional variable whose default-unset behaviour is intentional
    // (e.g. the EXPO_PUBLIC_FF_* flags — default-on, "omitting them
    // entirely is the normal, supported state" per that file). The check
    // must not push those to be uncommented.
    const m = line.match(/^\s*#?\s*([A-Z_][A-Z0-9_]*)\s*=/)
    if (m) out.add(m[1])
  }
  return out
}
const envWeb = parseEnvExample('apps/web/.env.example')
const envMobile = parseEnvExample('apps/mobile/.env.example')

const declaredAnywhere = (name) =>
  buildEnv.has(name) || passThrough.has(name) || envWeb.has(name) || envMobile.has(name)

// ---------------------------------------------------------------------------
// 3. Rules.
// ---------------------------------------------------------------------------
const failures = []

// (a) read but declared nowhere
for (const [name, files] of reads) {
  if (isAllowed(name, 'undeclared')) continue
  if (!declaredAnywhere(name)) {
    failures.push({
      rule: 'read-but-undeclared',
      name,
      detail: `read in ${files.join(', ')} — not in turbo.json build.env / globalPassThroughEnv, not in apps/web/.env.example or apps/mobile/.env.example. If it is a runtime value, add it to globalPassThroughEnv + the relevant .env.example; if a build input, to build.env + .env.example.`,
    })
  }
}

// (b) in build.env but read nowhere
for (const name of buildEnv) {
  if (isAllowed(name, 'unread')) continue
  if (!reads.has(name)) {
    failures.push({
      rule: 'declared-but-unread',
      name,
      detail: `listed in turbo.json build.env but no first-party code reads process.env.${name}. Either it is stale (a rename left it behind) or its reader was removed — drop it, or point it at the name the code actually uses.`,
    })
  }
}

// (a') NEXT_PUBLIC_* / EXPO_PUBLIC_* must still be in the matching .env.example
for (const [name, files] of reads) {
  if (name.startsWith('NEXT_PUBLIC_') && !envWeb.has(name)) {
    failures.push({
      rule: 'public-var-missing-from-env-example',
      name,
      detail: `read in ${files.join(', ')} and inlined into the web client bundle by framework inference, but absent from apps/web/.env.example — nothing documents that it must be set (and set at build time).`,
    })
  }
  if (name.startsWith('EXPO_PUBLIC_') && !envMobile.has(name)) {
    failures.push({
      rule: 'public-var-missing-from-env-example',
      name,
      detail: `read in ${files.join(', ')} but absent from apps/mobile/.env.example — an undocumented mobile build/runtime variable.`,
    })
  }
}

// (c) naming near-miss across surfaces
const surfaces = new Map() // name -> Set(surface labels)
const noteSurface = (name, label) => {
  if (!surfaces.has(name)) surfaces.set(name, new Set())
  surfaces.get(name).add(label)
}
for (const n of reads.keys()) noteSurface(n, 'code')
for (const n of buildEnv) noteSurface(n, 'turbo.json:build.env')
for (const n of passThrough) noteSurface(n, 'turbo.json:globalPassThroughEnv')
for (const n of envWeb) noteSurface(n, 'apps/web/.env.example')
for (const n of envMobile) noteSurface(n, 'apps/mobile/.env.example')

function editDistance1OrLess(a, b) {
  if (a === b) return true
  const dl = Math.abs(a.length - b.length)
  if (dl > 1) return false
  if (dl === 0) {
    let diff = 0
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff++
    return diff <= 1
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a]
  let i = 0
  let j = 0
  let skipped = false
  while (i < short.length && j < long.length) {
    if (short[i] === long[j]) {
      i++
      j++
    } else if (!skipped) {
      skipped = true
      j++
    } else {
      return false
    }
  }
  return true
}

// NB: a bare `NEXT_PUBLIC_`/`EXPO_PUBLIC_` prefix difference is NOT a
// near-miss — the codebase legitimately runs a public and a non-public
// variable side by side (e.g. NEXT_PUBLIC_SENTRY_DSN + SENTRY_DSN, same
// value different surface; NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY,
// different keys). A public var missing from its .env.example is caught by
// the dedicated rule above instead. What IS always a mistake: a trailing
// "S" (`..._KEYS` for `..._KEY`) or a one-character typo.
function nearMiss(a, b) {
  if (a === b) return null
  if (a === `${b}S` || b === `${a}S`) return 'trailing "S"'
  if (editDistance1OrLess(a, b)) return 'edit distance 1'
  return null
}

const allNames = [...surfaces.keys()].sort()
const reportedPairs = new Set()
for (let i = 0; i < allNames.length; i++) {
  for (let j = i + 1; j < allNames.length; j++) {
    const a = allNames[i]
    const b = allNames[j]
    // both fully-known-good (present on >=2 surfaces each) => not a drift signal
    const kind = nearMiss(a, b)
    if (!kind) continue
    const key = `${a}::${b}`
    if (reportedPairs.has(key)) continue
    reportedPairs.add(key)
    failures.push({
      rule: 'naming-near-miss',
      name: `${a}  ~  ${b}`,
      detail: `${kind}. ${a} on [${[...surfaces.get(a)].join(', ')}]; ${b} on [${[...surfaces.get(b)].join(', ')}]. If these are the same variable spelled two ways, make every surface agree; if genuinely distinct, this line is noise — rename one so they are not near-identical.`,
    })
  }
}

// ---------------------------------------------------------------------------
// 4. Report.
// ---------------------------------------------------------------------------
if (failures.length > 0) {
  console.error(`[check-env-consistency] FAIL: ${failures.length} issue(s)\n`)
  const byRule = new Map()
  for (const f of failures) {
    if (!byRule.has(f.rule)) byRule.set(f.rule, [])
    byRule.get(f.rule).push(f)
  }
  for (const [ruleName, items] of byRule) {
    console.error(`  ${ruleName} (${items.length}):`)
    for (const it of items) {
      console.error(`    - ${it.name}`)
      console.error(`      ${it.detail}`)
    }
    console.error('')
  }
  console.error(
    'Exceptions (NEXT_PUBLIC_*, EXPO_PUBLIC_*, UAT_*, platform built-ins) are encoded in the ALLOWLIST at the top of scripts/check-env-consistency.mjs with reasons. If a new exception is legitimate, add it there — do not just silence this.',
  )
  process.exit(1)
}

const counts = [
  `${reads.size} process.env.* reads`,
  `${buildEnv.size} in build.env`,
  `${passThrough.size} in globalPassThroughEnv`,
  `${envWeb.size} in web/.env.example`,
  `${envMobile.size} in mobile/.env.example`,
]
console.log(`[check-env-consistency] PASS: ${counts.join(', ')} — all cross-referenced, no drift`)
process.exit(0)
