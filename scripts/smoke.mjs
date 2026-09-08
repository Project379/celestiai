#!/usr/bin/env node
/**
 * Post-deploy smoke test (SMOKE-TEST).
 *
 * Runs once against a freshly deployed environment and fails loudly if any
 * compute route or cron handler is broken. Built after the daily-horoscope
 * cron sat dead for weeks with nothing surfacing it — that cron returns
 * HTTP 200 even when its work fails, so this script asserts on RESPONSE
 * BODIES, not status codes.
 *
 * What it hits:
 *   GET /                                     — liveness + X-Deploy-SHA match
 *   GET /api/cron/daily-horoscope?probe=1     — VAPID + push_subscriptions
 *                                                + push_tokens reads, no send
 *   GET /api/cron/cleanup-deleted-accounts?probe=1 — expired-account query,
 *                                                no delete
 *   GET /api/cron/recommendation-catalog?probe=1  — auth + TMDB creds
 *                                                (shallow; see
 *                                                VERIFICATION-SURFACE-GAPS.md)
 *   GET /api/smoke                            — Swiss Ephemeris, Postgres,
 *                                                and (unless SMOKE_SKIP_AI)
 *                                                one real Gemini call
 *
 * PROBE MARKER: every request carries `x-stellaeum-probe: smoke` and the
 * `?probe=1` / dedicated-route contract keeps side effects off — no
 * notification is sent, no row is written, no account is deleted. A smoke
 * run should read as noise to alerting, not as an outage or as traffic.
 *
 * Env:
 *   SMOKE_BASE_URL     required — e.g. https://stellaeum.com (no trailing /)
 *   SMOKE_SECRET       required — bearer for /api/smoke
 *   CRON_SECRET        required — bearer for the three cron probes
 *   SMOKE_EXPECTED_SHA optional — assert the deploy's X-Deploy-SHA equals this
 *   SMOKE_SKIP_AI      optional — "1" to skip the paid Gemini check
 *
 * Exit 0 = every check passed. Exit 1 = at least one failed (details printed).
 */

const BASE = (process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '')
const SMOKE_SECRET = process.env.SMOKE_SECRET || ''
const CRON_SECRET = process.env.CRON_SECRET || ''
const EXPECTED_SHA = process.env.SMOKE_EXPECTED_SHA || ''
const SKIP_AI = process.env.SMOKE_SKIP_AI === '1'

if (!BASE || !SMOKE_SECRET || !CRON_SECRET) {
  console.error(
    '[smoke] missing env: SMOKE_BASE_URL, SMOKE_SECRET and CRON_SECRET are all required',
  )
  process.exit(1)
}

const PROBE_HEADER = { 'x-stellaeum-probe': 'smoke' }
const TIMEOUT_MS = 45_000

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const results = []
function record(name, ok, detail) {
  results.push({ name, ok, detail })
  console.log(`[smoke] ${ok ? 'PASS' : 'FAIL'}  ${name}  —  ${detail}`)
}

async function req(path, { bearer } = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: {
        ...PROBE_HEADER,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
      },
      signal: ctrl.signal,
    })
    const text = await res.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = undefined
    }
    return { res, text, json }
  } finally {
    clearTimeout(t)
  }
}

async function checkRoot() {
  try {
    const { res } = await req('/')
    if (!res.ok) return record('GET /', false, `status ${res.status}`)
    const sha = res.headers.get('x-deploy-sha')
    if (EXPECTED_SHA) {
      if (!sha) return record('GET /', false, 'no x-deploy-sha header on response')
      if (sha !== EXPECTED_SHA && !EXPECTED_SHA.startsWith(sha) && !sha.startsWith(EXPECTED_SHA)) {
        return record(
          'GET /',
          false,
          `x-deploy-sha ${sha} != expected ${EXPECTED_SHA} — smoke ran against a different build`,
        )
      }
      return record('GET /', true, `live, x-deploy-sha ${sha} matches deploy`)
    }
    return record('GET /', true, `live (x-deploy-sha ${sha ?? 'unset'})`)
  } catch (err) {
    return record('GET /', false, String(err))
  }
}

async function checkCron(path, assert) {
  try {
    const { res, json, text } = await req(`${path}?probe=1`, { bearer: CRON_SECRET })
    if (!res.ok) return record(path, false, `status ${res.status}: ${text.slice(0, 200)}`)
    if (!json || json.probe !== true) {
      return record(path, false, `body is not a probe response: ${text.slice(0, 200)}`)
    }
    const problem = assert(json)
    if (problem) return record(path, false, problem)
    return record(path, true, JSON.stringify(stripProbe(json)))
  } catch (err) {
    return record(path, false, String(err))
  }
}

function stripProbe(obj) {
  const { probe, ...rest } = obj
  void probe
  return rest
}

/** A transport tally is healthy iff it has no `error` and a numeric `eligible`. */
function badTransport(t) {
  if (!t || typeof t !== 'object') return 'missing transport tally'
  if (t.error) return `transport error: ${t.error}`
  if (typeof t.eligible !== 'number') return 'no eligible count in probe response'
  return null
}

async function checkSmoke() {
  try {
    const path = SKIP_AI ? '/api/smoke?ai=0' : '/api/smoke'
    const { res, json, text } = await req(path, { bearer: SMOKE_SECRET })
    if (!json || !Array.isArray(json.checks)) {
      return record('GET /api/smoke', false, `unexpected body (status ${res.status}): ${text.slice(0, 200)}`)
    }
    const failed = json.checks.filter((c) => !c.ok)
    const summary = json.checks.map((c) => `${c.name}:${c.ok ? 'ok' : 'FAIL'}(${c.ms}ms)`).join(' ')
    if (json.ok !== true || failed.length > 0) {
      return record(
        'GET /api/smoke',
        false,
        `${summary} — ${failed.map((c) => `${c.name}: ${c.detail}`).join('; ')}`,
      )
    }
    return record('GET /api/smoke', true, summary)
  } catch (err) {
    return record('GET /api/smoke', false, String(err))
  }
}

await checkRoot()
await checkCron('/api/cron/daily-horoscope', (j) => badTransport(j.web) || badTransport(j.mobile))
await checkCron('/api/cron/cleanup-deleted-accounts', (j) =>
  typeof j.eligible === 'number' ? null : 'no eligible count',
)
await checkCron('/api/cron/recommendation-catalog', (j) =>
  j.tmdbTokenPresent === true ? null : 'TMDB_API_READ_TOKEN not configured in the deploy',
)
await checkSmoke()

const failures = results.filter((r) => !r.ok)
console.log(
  `\n[smoke] ${results.length - failures.length}/${results.length} checks passed` +
    (failures.length ? ` — FAILED: ${failures.map((f) => f.name).join(', ')}` : ''),
)
process.exit(failures.length ? 1 : 0)
