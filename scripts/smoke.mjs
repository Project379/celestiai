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
 *   SMOKE_BASE_URL     required — the canonical, UNPROTECTED production
 *                      domain, e.g. https://stellaeum.com (no trailing /).
 *                      NOT a raw *.vercel.app deployment URL — those sit
 *                      behind Vercel Deployment Protection and bounce every
 *                      unauthenticated request to an SSO HTML page.
 *   SMOKE_SECRET       required — bearer for /api/smoke
 *   CRON_SECRET        required — bearer for the three cron probes
 *   SMOKE_EXPECTED_SHA optional — assert the deploy's X-Deploy-SHA equals this
 *   SMOKE_SKIP_AI      optional — "1" to skip the paid Gemini check
 *
 * Exit 0 = every check passed. Exit 1 = at least one failed (details printed).
 */

const BASE = (process.env.SMOKE_BASE_URL || '').replace(/\/+$/, '')
// .trim() both: a trailing newline in a secret pasted into the GitHub repo
// secrets UI is invisible there and neither this script nor verifyCronSecret
// normalises it — a length mismatch → 401. BASE is normalised one line up for
// the same reason. SMOKE_SECRET works today only because it was pasted clean.
const SMOKE_SECRET = process.env.SMOKE_SECRET?.trim() || ''
const CRON_SECRET = process.env.CRON_SECRET?.trim() || ''
const EXPECTED_SHA = process.env.SMOKE_EXPECTED_SHA || ''
const SKIP_AI = process.env.SMOKE_SKIP_AI === '1'
const IN_CI = process.env.GITHUB_ACTIONS === 'true' || process.env.CI === 'true'

if (!BASE || !SMOKE_SECRET || !CRON_SECRET) {
  console.error(
    '[smoke] missing env: SMOKE_BASE_URL, SMOKE_SECRET and CRON_SECRET are all required',
  )
  process.exit(1)
}

// The deploy-SHA assertion is the whole reason this runs as a
// deployment_status Action rather than a Vercel cron — without it the
// smoke test cannot prove it hit the build that was just deployed. An
// assertion that silently skips is worse than none, so in CI a missing
// SMOKE_EXPECTED_SHA is a hard failure, not "optional". Locally (no CI)
// it stays optional so `node scripts/smoke.mjs` against a running dev
// server still works.
if (IN_CI && !EXPECTED_SHA) {
  console.error(
    '[smoke] SMOKE_EXPECTED_SHA is empty in CI — refusing to run a smoke test that cannot verify which build it hit. ' +
      'The workflow should set it from `github.event.deployment.sha || github.sha` (NOT deployment_status.sha, which has no such field).',
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

/**
 * True when a response is Vercel's Deployment-Protection / SSO login wall
 * rather than the app. Symptoms seen in the wild: HTTP 401 with an HTML
 * body carrying `data-dpl-id`, a `<title>` of "Authentication Required",
 * a `Set-Cookie: _vercel_sso_nonce`, or a redirect to `vercel.com/sso` /
 * `/.well-known/vercel-user-meta`. Any one of these means the smoke test
 * is pointed at a protected URL and NONE of its checks can pass — a
 * generic "body is not JSON" per check buries that.
 */
function looksLikeDeploymentProtection(res, text) {
  const setCookie = res.headers.get('set-cookie') || ''
  if (setCookie.includes('_vercel_sso_nonce')) return true
  if (/vercel\.com\/sso|\/sso-api|\.well-known\/vercel-user-meta/i.test(res.url || '')) return true
  if (!(res.headers.get('content-type') || '').includes('text/html')) return false
  const body = (text || '').slice(0, 4000)
  return (
    /data-dpl-id=/.test(body) ||
    /Authentication Required/i.test(body) ||
    /Vercel Authentication/i.test(body) ||
    /vercel\.com\/sso/i.test(body) ||
    /\.well-known\/vercel-user-meta/i.test(body)
  )
}

let protectionReported = false
/** Record the deployment-protection failure — full guidance once, terse after. */
function recordProtection(name) {
  if (!protectionReported) {
    protectionReported = true
    return record(
      name,
      false,
      `${BASE} is behind Vercel Deployment Protection — the request was answered by the Vercel SSO login page, not the app. ` +
        `Point SMOKE_BASE_URL at the canonical (unprotected) production domain, or set a VERCEL_AUTOMATION_BYPASS_SECRET and send it as the x-vercel-protection-bypass header. No app checks can pass until then.`,
    )
  }
  return record(name, false, 'blocked by Vercel Deployment Protection (see first failure)')
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
    return { res, text, json, protection: looksLikeDeploymentProtection(res, text) }
  } finally {
    clearTimeout(t)
  }
}

async function checkRoot() {
  try {
    const { res, text, protection } = await req('/')
    if (protection) return recordProtection('GET /')
    if (!res.ok) return record('GET /', false, `status ${res.status}: ${text.slice(0, 160)}`)
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
    const { res, json, text, protection } = await req(`${path}?probe=1`, { bearer: CRON_SECRET })
    if (protection) return recordProtection(path)
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
    const { res, json, text, protection } = await req(path, { bearer: SMOKE_SECRET })
    if (protection) return recordProtection('GET /api/smoke')
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
