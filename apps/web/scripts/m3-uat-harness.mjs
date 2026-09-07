#!/usr/bin/env node
/**
 * M3 UAT harness — runtime verification of every extracted endpoint.
 *
 * Invoke:
 *   node --env-file=apps/web/.env.example.local apps/web/scripts/m3-uat-harness.mjs
 *
 * Prereqs: dev server running on http://localhost:3000.
 *
 * Flow:
 *   1. Resolve/create a Clerk test user, mint a session JWT.
 *   2. Ensure users row exists in Supabase for that Clerk ID (free tier).
 *   3. Unauth 401 shape per API endpoint (bulk).
 *   4. Protected page routes redirect anon → /sign-in; public page
 *      routes return 200; /subscription/success preserves session_id
 *      through the redirect_url query param.
 *   5. /api/planets/current happy path (public).
 *   6. Auth'd self-seed: POST /api/birth-data → chartId.
 *   7. GET/PATCH/DELETE birth-data flows against the seeded chart.
 *   8. POST /api/chart/calculate (fresh then cached).
 *   9. Flip tier=premium via service role → hit premium-gated endpoints.
 *  10. Flip tier=free → verify 403 PREMIUM_REQUIRED shape.
 *  11. Crystal picker divergence analysis (read-only catalog query).
 *  12. Cleanup: delete the test chart + audit rows + uncollected recs.
 *
 * Writes ./RESULTS.json next to this script and prints human-readable log.
 */

import { createClient } from '@supabase/supabase-js'
import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const BASE_URL = process.env.UAT_BASE_URL ?? 'http://localhost:3000'
const TEST_EMAIL = process.env.UAT_TEST_EMAIL ?? 'm3uat@celestia-ai.dev'

const CLERK_SECRET = process.env.CLERK_SECRET_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SECRET = process.env.SUPABASE_SECRET_KEY

if (!CLERK_SECRET || !SUPABASE_URL || !SUPABASE_SECRET) {
  console.error('Missing env. Need CLERK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY.')
  process.exit(2)
}

// Clerk REST helpers (avoids @clerk/backend package-resolution gymnastics from
// a workspace script — secret-key REST is the documented path for CI agents).
async function clerkFetch(path, init = {}) {
  const res = await fetch(`https://api.clerk.com/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { _raw: text }
  }
  if (!res.ok) {
    throw new Error(`Clerk ${init.method ?? 'GET'} ${path} → ${res.status}: ${text.slice(0, 200)}`)
  }
  return body
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const results = []
let pass = 0
let fail = 0

function record(name, status, detail) {
  const ok = status === 'pass'
  results.push({ name, status, detail })
  const icon = ok ? 'PASS' : status === 'skip' ? 'SKIP' : 'FAIL'
  console.log(`[${icon}] ${name}${detail ? ' — ' + detail : ''}`)
  if (ok) pass++
  else if (status === 'fail') fail++
}

function expect(name, cond, detail) {
  record(name, cond ? 'pass' : 'fail', detail)
  return cond
}

async function fetchJson(path, init = {}) {
  // Next.js dev compiles routes on-demand; first hit per route can exceed
  // undici's 10s default headers timeout. Retry once with a longer timeout
  // if the first attempt times out during route compilation.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(BASE_URL + path, {
        ...init,
        signal: AbortSignal.timeout(60_000),
      })
      const text = await res.text()
      let json = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        json = { _raw: text }
      }
      return { status: res.status, json, headers: Object.fromEntries(res.headers.entries()) }
    } catch (err) {
      if (attempt === 0) {
        console.log(`  (retrying ${path} after ${err.code ?? err.name})`)
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
}

async function warmRoutes(paths) {
  console.log('\n== Warming up route compilation ==')
  for (const p of paths) {
    try {
      await fetch(BASE_URL + p, { signal: AbortSignal.timeout(60_000) })
      console.log(`  warm ${p}`)
    } catch (err) {
      console.log(`  warm ${p} failed: ${err.code ?? err.message}`)
    }
  }
}

async function ensureClerkUser(email = TEST_EMAIL) {
  console.log(`  ensureClerkUser: listing users for ${email}...`)
  const query = encodeURIComponent(email)
  const existing = await clerkFetch(`/users?email_address=${query}&limit=10`)
  console.log(`  ensureClerkUser: list returned ${Array.isArray(existing) ? existing.length : 'n/a'}`)
  if (Array.isArray(existing)) {
    const match = existing.find((u) =>
      (u.email_addresses ?? []).some((e) => e.email_address === email),
    )
    if (match) {
      console.log(`  ensureClerkUser: reusing user ${match.id}`)
      return match
    }
  }

  console.log(`  ensureClerkUser: creating new user ${email}`)
  const created = await clerkFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [email],
      password: 'uat-' + Math.random().toString(36).slice(2) + 'Aa1!',
      skip_password_checks: true,
      skip_password_requirement: true,
    }),
  })
  console.log(`  ensureClerkUser: created user ${created.id}`)
  return created
}

async function mintSessionToken(userId) {
  console.log('  mintSessionToken: creating session...')
  const session = await clerkFetch('/sessions', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
  console.log(`  mintSessionToken: session ${session.id}, fetching token...`)
  const tok = await clerkFetch(`/sessions/${session.id}/tokens`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  console.log(`  mintSessionToken: jwt len=${tok.jwt?.length}`)
  return { sessionId: session.id, jwt: tok.jwt }
}

async function ensureUserRow(clerkId, tier = 'free') {
  await supabase.from('users').upsert(
    { clerk_id: clerkId, subscription_tier: tier },
    { onConflict: 'clerk_id' },
  )
}

async function setTier(clerkId, tier) {
  await supabase
    .from('users')
    .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
    .eq('clerk_id', clerkId)
}

const UNAUTH_ENDPOINTS = [
  { method: 'POST', path: '/api/chart/calculate', body: { chartId: '00000000-0000-0000-0000-000000000000' } },
  { method: 'GET', path: '/api/birth-data' },
  { method: 'POST', path: '/api/birth-data', body: {} },
  { method: 'GET', path: '/api/birth-data/00000000-0000-0000-0000-000000000000' },
  { method: 'PATCH', path: '/api/birth-data/00000000-0000-0000-0000-000000000000', body: {} },
  { method: 'DELETE', path: '/api/birth-data/00000000-0000-0000-0000-000000000000' },
  { method: 'GET', path: '/api/diary/entries' },
  { method: 'POST', path: '/api/diary/entries', body: {} },
  { method: 'GET', path: '/api/diary/entries/00000000-0000-0000-0000-000000000000' },
  { method: 'PATCH', path: '/api/diary/entries/00000000-0000-0000-0000-000000000000', body: {} },
  { method: 'DELETE', path: '/api/diary/entries/00000000-0000-0000-0000-000000000000' },
  { method: 'GET', path: '/api/crystals' },
  { method: 'POST', path: '/api/crystals/collect', body: { recommendationId: 'x' } },
  { method: 'POST', path: '/api/crystals/daily/collect' },
  { method: 'GET', path: '/api/crystals/daily-streak' },
  { method: 'GET', path: '/api/stripe/status' },
  { method: 'GET', path: '/api/transits/overview?chartId=00000000-0000-0000-0000-000000000000' },
]

async function checkUnauthGates() {
  console.log('\n== Unauthenticated 401 gate shape ==')
  for (const ep of UNAUTH_ENDPOINTS) {
    const { status, json } = await fetchJson(ep.path, {
      method: ep.method,
      headers: { 'Content-Type': 'application/json' },
      body: ep.body ? JSON.stringify(ep.body) : undefined,
    })
    // Post 635f1a4 — every user-scoped 401 body is BG. The EN
    // "Unauthorized" fallback was removed; asserting the BG string
    // alone catches regressions that re-introduce the EN throw.
    // Message updated 2026-07-30 (register-conversion workstream):
    // "Неоторизиран достъп" -> "Сесията ти изтече. Влез отново."
    expect(
      `${ep.method} ${ep.path} → 401 Сесията ти изтече. Влез отново.`,
      status === 401 && json?.error?.includes('Сесията'),
      `status=${status} body=${JSON.stringify(json).slice(0, 80)}`,
    )
  }
}

// Protected page routes — anon HTML fetch must redirect to /sign-in via
// Clerk middleware (auth.protect). Covers every path under (protected)/
// that actually has a page.tsx today, plus /subscription/success which
// lives there to catch the Stripe redirect. /pricing is deliberately
// NOT here — it was moved out of (protected)/ in 7849a5d because it's
// public marketing; an anon fetch to /pricing must return 200.
const PROTECTED_PAGE_ROUTES = [
  '/dashboard',
  '/chart',
  '/birth-data',
  '/birth-data/new',
  '/you',
  '/you/crystals',
  '/you/crystals/guide',
  '/you/guide',
  '/you/recommendations',
  '/rhythm',
  '/rhythm/journal',
  '/circle',
  '/subscription/success',
]

const PUBLIC_PAGE_ROUTES = ['/', '/sign-in', '/sign-up', '/pricing']

async function fetchNoFollow(path, init = {}) {
  // Note on Clerk dev-mode behavior:
  //
  // In development, when auth.protect() fires against a request that
  // lacks Clerk's __clerk_db_jwt dev-browser cookie (which a raw curl
  // or Node fetch will), Clerk does NOT issue a 3xx redirect. Instead
  // it does an internal rewrite to /clerk_<timestamp> which Next then
  // 404s on. The authoritative programmatic signal for "middleware is
  // blocking this route" in that mode is the response headers:
  //
  //   x-clerk-auth-status: signed-out
  //   x-clerk-auth-reason: protect-rewrite[, dev-browser-missing]
  //
  // In production-mode Clerk, auth.protect() issues a normal 307
  // redirect with Location: /sign-in?redirect_url=... — the harness
  // handles both paths below.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(BASE_URL + path, {
        ...init,
        redirect: 'manual',
        signal: AbortSignal.timeout(60_000),
      })
      return {
        status: res.status,
        location: res.headers.get('location'),
        clerkAuthStatus: res.headers.get('x-clerk-auth-status'),
        clerkAuthReason: res.headers.get('x-clerk-auth-reason'),
      }
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 500))
        continue
      }
      throw err
    }
  }
}

function isMiddlewareBlocked(r) {
  // Either path signals middleware-enforced auth:
  //   prod-mode: 3xx + Location containing /sign-in
  //   dev-mode:  Clerk protect-rewrite headers
  const isProdRedirect =
    r.status >= 300 && r.status < 400 && (r.location ?? '').includes('/sign-in')
  const isDevRewrite =
    r.clerkAuthStatus === 'signed-out' &&
    (r.clerkAuthReason ?? '').includes('protect')
  return isProdRedirect || isDevRewrite
}

async function checkProtectedPageRedirects() {
  console.log('\n== Protected page routes — anon blocked by Clerk middleware ==')
  for (const route of PROTECTED_PAGE_ROUTES) {
    const r = await fetchNoFollow(route)
    expect(
      `GET ${route} (anon) → middleware-blocked`,
      isMiddlewareBlocked(r),
      `status=${r.status} clerk-status=${r.clerkAuthStatus ?? '-'} clerk-reason=${r.clerkAuthReason ?? '-'} loc=${r.location?.slice(0, 60) ?? '-'}`,
    )
  }
}

async function checkSubscriptionSuccessRedirectUrl() {
  // /subscription/success?session_id=... is supposed to bounce anon
  // users through /sign-in?redirect_url=<encoded original URL> so the
  // session_id survives the sign-in round-trip and
  // activatePremiumFromSession can read it afterwards (531c9f8).
  //
  // In Clerk dev mode without a dev-browser cookie, the observable
  // middleware signal is the protect-rewrite (x-clerk-auth-status:
  // signed-out). We can verify the route is middleware-blocked from
  // a plain curl — the redirect_url preservation is a Clerk SDK
  // invariant produced only when a real dev browser or a signed-out
  // production request triggers the redirect. That round-trip MUST
  // be verified in BROWSER_CHECKLIST.md; here we only verify the
  // middleware is firing on the route, which is the necessary (not
  // sufficient) condition.
  console.log('\n== /subscription/success middleware-blocks anon (redirect_url round-trip is browser-only) ==')
  const sessionIdProbe = 'cs_test_uat_session_id_probe'
  const originalPath = `/subscription/success?session_id=${sessionIdProbe}`
  const r = await fetchNoFollow(originalPath)
  expect(
    'GET /subscription/success?session_id=… (anon) → middleware-blocked',
    isMiddlewareBlocked(r),
    `status=${r.status} clerk-status=${r.clerkAuthStatus ?? '-'} clerk-reason=${r.clerkAuthReason ?? '-'}`,
  )

  // If we DID get a prod-style 3xx with a Location header, verify the
  // round-trip. This path runs when the harness is pointed at a
  // production-mode Clerk instance or a dev instance with a dev
  // browser cookie set via Cookie header.
  if (r.status >= 300 && r.status < 400 && r.location) {
    let redirectsToSignIn = false
    let redirectUrlValue = null
    try {
      const parsed = new URL(r.location, BASE_URL)
      redirectsToSignIn = parsed.pathname === '/sign-in'
      redirectUrlValue = parsed.searchParams.get('redirect_url')
    } catch {}
    const preservesPath = redirectUrlValue?.includes('/subscription/success')
    const preservesSessionId = redirectUrlValue?.includes(sessionIdProbe)
    expect(
      '(prod-mode) redirect_url preserves path + session_id',
      redirectsToSignIn && preservesPath && preservesSessionId,
      `redirect_url=${redirectUrlValue?.slice(0, 140) ?? '-'}`,
    )
  } else {
    record(
      '(dev-mode) redirect_url preserves path + session_id',
      'skip',
      'Clerk protect-rewrite in dev mode does not expose Location; browser UAT must verify the full session_id round-trip',
    )
  }
}

async function checkPublicPagesStayPublic() {
  // Inverse assertion — catches a future matcher widening that
  // accidentally sweeps marketing / auth-landing pages into
  // protection and breaks the conversion funnel (anon visitors
  // redirected away from /pricing, /, /sign-in, /sign-up before
  // they can sign up).
  console.log('\n== Public page routes stay public ==')
  for (const route of PUBLIC_PAGE_ROUTES) {
    const r = await fetchNoFollow(route)
    expect(
      `GET ${route} (anon) → not middleware-blocked`,
      !isMiddlewareBlocked(r),
      `status=${r.status} clerk-status=${r.clerkAuthStatus ?? '-'} clerk-reason=${r.clerkAuthReason ?? '-'}`,
    )
  }
}

async function checkPublicHappyPaths() {
  console.log('\n== Public endpoints ==')
  const { status, json } = await fetchJson('/api/planets/current')
  expect(
    'GET /api/planets/current → 200 + planets[] + calculatedAt',
    status === 200 &&
      Array.isArray(json?.planets) &&
      json.planets.length > 0 &&
      typeof json.calculatedAt === 'string',
    `status=${status} planets.length=${json?.planets?.length}`,
  )
}

async function checkAuthHappyPaths(jwt, clerkId) {
  console.log('\n== Authenticated happy paths (free tier) ==')
  const auth = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }

  // Create chart
  const createBody = {
    name: 'M3 UAT Chart',
    birthDate: '1990-06-15',
    birthTimeKnown: true,
    birthTime: '14:30',
    cityName: 'София',
    latitude: 42.6977,
    longitude: 23.3219,
  }
  const create = await fetchJson('/api/birth-data', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(createBody),
  })
  if (!expect(
    'POST /api/birth-data → 201 + chart row',
    create.status === 201 && create.json?.id && create.json.user_id === clerkId,
    `status=${create.status} id=${create.json?.id}`,
  )) return null
  const chartId = create.json.id

  // Validation failure branch
  const badCreate = await fetchJson('/api/birth-data', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ name: '' }),
  })
  expect(
    'POST /api/birth-data (bad input) → 400 + details{}',
    badCreate.status === 400 && typeof badCreate.json?.details === 'object',
    `status=${badCreate.status}`,
  )

  // List
  const list = await fetchJson('/api/birth-data', { headers: auth })
  expect(
    'GET /api/birth-data → 200 + array containing chartId',
    list.status === 200 && Array.isArray(list.json) && list.json.some((c) => c.id === chartId),
    `status=${list.status} len=${list.json?.length}`,
  )

  // Get single
  const getOne = await fetchJson(`/api/birth-data/${chartId}`, { headers: auth })
  expect(
    `GET /api/birth-data/${chartId} → 200`,
    getOne.status === 200 && getOne.json?.id === chartId,
    `status=${getOne.status}`,
  )

  // Get non-existent
  const getMissing = await fetchJson('/api/birth-data/00000000-0000-0000-0000-000000000000', { headers: auth })
  expect(
    'GET /api/birth-data/<nonexistent> → 404',
    getMissing.status === 404 && getMissing.json?.error?.includes('не бяха намерени'),
    `status=${getMissing.status}`,
  )

  // Chart calculate (fresh compute)
  const calcFresh = await fetchJson('/api/chart/calculate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId }),
  })
  expect(
    'POST /api/chart/calculate → 200 + planets[]+ascendant+mc (fresh)',
    calcFresh.status === 200 &&
      Array.isArray(calcFresh.json?.planets) &&
      calcFresh.json?.ascendant &&
      calcFresh.json?.mc,
    `status=${calcFresh.status} planets=${calcFresh.json?.planets?.length}`,
  )

  // Chart calculate (cached) — cache hit is verified by (a) 200 response,
  // (b) same ascendant longitude as fresh compute (deterministic for the same
  // input), (c) exactly one chart_calculations row exists for this chartId.
  // Byte-for-byte stringify equality is avoided because JSONB roundtrip can
  // reorder object keys even when numeric content is identical.
  const calcCached = await fetchJson('/api/chart/calculate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId }),
  })
  const { data: calcRows } = await supabase
    .from('chart_calculations')
    .select('chart_id')
    .eq('chart_id', chartId)
  expect(
    'POST /api/chart/calculate (2nd call) → 200 + deterministic ascendant + single cache row',
    calcCached.status === 200 &&
      calcCached.json?.ascendant?.longitude === calcFresh.json?.ascendant?.longitude &&
      calcCached.json?.planets?.length === calcFresh.json?.planets?.length &&
      (calcRows?.length ?? 0) === 1,
    `asc_match=${calcCached.json?.ascendant?.longitude === calcFresh.json?.ascendant?.longitude} planets=${calcCached.json?.planets?.length}/${calcFresh.json?.planets?.length} rows=${calcRows?.length}`,
  )

  // Chart calculate with fake chartId → 404 CHART_NOT_FOUND
  const calcMissing = await fetchJson('/api/chart/calculate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId: '00000000-0000-0000-0000-000000000000' }),
  })
  expect(
    'POST /api/chart/calculate (missing chart) → 404',
    calcMissing.status === 404,
    `status=${calcMissing.status}`,
  )

  // Patch
  const patch = await fetchJson(`/api/birth-data/${chartId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ name: 'M3 UAT Chart (updated)' }),
  })
  expect(
    'PATCH /api/birth-data/<id> → 200 + name updated',
    patch.status === 200 && patch.json?.name === 'M3 UAT Chart (updated)',
    `status=${patch.status}`,
  )

  // Verify chart_calculations was invalidated after patch
  const { data: calcAfterPatch } = await supabase
    .from('chart_calculations')
    .select('chart_id')
    .eq('chart_id', chartId)
    .maybeSingle()
  expect(
    'PATCH invalidated chart_calculations cache',
    !calcAfterPatch,
    `cache row after patch: ${calcAfterPatch ? 'present' : 'gone'}`,
  )

  // Stripe status (no session_id, just read tier)
  const stripe = await fetchJson('/api/stripe/status', { headers: auth })
  expect(
    'GET /api/stripe/status → 200 { tier: "free" }',
    stripe.status === 200 && stripe.json?.tier === 'free',
    `status=${stripe.status} tier=${stripe.json?.tier}`,
  )

  // Free-tier crystals-today — post cb54ede, free users get auto-collect
  // and a streak just like premium. isPremium still reflects DB tier for
  // UI layering but the streak mechanic is no longer gated.
  const today = await fetchJson('/api/crystals/today', { headers: auth })
  expect(
    'GET /api/crystals/today (free) → 200 + crystal + isPremium:false + streak computed',
    today.status === 200 &&
      today.json?.crystal?.slug &&
      today.json?.isPremium === false &&
      today.json?.streak &&
      typeof today.json.streak.current === 'number',
    `status=${today.status} isPremium=${today.json?.isPremium} streak.current=${today.json?.streak?.current}`,
  )

  // Free-tier daily/collect — post cb54ede, open to any authed user.
  // Was 403 PREMIUM_REQUIRED pre-2026-04-20 matrix; now 200 with
  // success:true. Second call is idempotent via the (user_id, date)
  // unique index on user_daily_crystals.
  const dailyCollectFree = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  expect(
    'POST /api/crystals/daily/collect (free) → 200 success:true',
    dailyCollectFree.status === 200 && dailyCollectFree.json?.success === true,
    `status=${dailyCollectFree.status} success=${dailyCollectFree.json?.success}`,
  )

  // Free-tier transits — post da69a9e, transits are free per matrix.
  // Was 403 PREMIUM_REQUIRED; now 200 with activeTransits[].
  const transitsFree = await fetchJson(`/api/transits/overview?chartId=${chartId}`, { headers: auth })
  expect(
    'GET /api/transits/overview (free) → 200 + activeTransits',
    transitsFree.status === 200 && Array.isArray(transitsFree.json?.activeTransits),
    `status=${transitsFree.status} activeTransits=${Array.isArray(transitsFree.json?.activeTransits)}`,
  )

  // /api/crystals (full overview: catalog + collection + recommendations)
  // stays premium per matrix. Free 403 PREMIUM_REQUIRED is correct.
  const crystalsGet = await fetchJson('/api/crystals', { headers: auth })
  expect(
    'GET /api/crystals (free) → 403 PREMIUM_REQUIRED',
    crystalsGet.status === 403 && crystalsGet.json?.code === 'PREMIUM_REQUIRED',
    `status=${crystalsGet.status} code=${crystalsGet.json?.code}`,
  )

  // /api/crystals/collect (claim a recommendation) stays premium per
  // matrix — recommendations are premium; the claim endpoint must be too.
  const collectFree = await fetchJson('/api/crystals/collect', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ recommendationId: '00000000-0000-0000-0000-000000000000' }),
  })
  expect(
    'POST /api/crystals/collect (free) → 403 PREMIUM_REQUIRED',
    collectFree.status === 403 && collectFree.json?.code === 'PREMIUM_REQUIRED',
    `status=${collectFree.status}`,
  )

  return chartId
}

async function checkPremiumPaths(jwt, clerkId, chartId) {
  console.log('\n== Premium-gated paths (tier flipped via service role) ==')
  await setTier(clerkId, 'premium')
  const auth = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }

  const stripe = await fetchJson('/api/stripe/status', { headers: auth })
  expect(
    'GET /api/stripe/status → 200 { tier: "premium" }',
    stripe.status === 200 && stripe.json?.tier === 'premium',
    `tier=${stripe.json?.tier}`,
  )

  const transits = await fetchJson(`/api/transits/overview?chartId=${chartId}`, { headers: auth })
  expect(
    'GET /api/transits/overview (premium) → 200 + activeTransits',
    transits.status === 200 && Array.isArray(transits.json?.activeTransits),
    `status=${transits.status}`,
  )

  const overview = await fetchJson(`/api/crystals?chartId=${chartId}`, { headers: auth })
  expect(
    'GET /api/crystals (premium) → 200 + catalog + recommendations',
    overview.status === 200 &&
      Array.isArray(overview.json?.catalog) &&
      Array.isArray(overview.json?.recommendations),
    `status=${overview.status} catalog.length=${overview.json?.catalog?.length} recs=${overview.json?.recommendations?.length}`,
  )

  // Daily collect (idempotent) — premium path. Note: the free-tier
  // path already exercised daily/collect in the checkAuthHappyPaths
  // block after cb54ede, so the "1st call" here is actually the N+1th
  // call today for this test user. That's fine — we assert the
  // alreadyCollected=true idempotent branch, which holds regardless
  // of prior state within the same Sofia day.
  const daily1 = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  const daily2 = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  expect(
    'POST /api/crystals/daily/collect (premium) → 200 success:true',
    daily1.status === 200 && daily1.json?.success === true,
    `status=${daily1.status} alreadyCollected=${daily1.json?.alreadyCollected}`,
  )
  expect(
    'POST /api/crystals/daily/collect 2nd call → 200 alreadyCollected=true',
    daily2.status === 200 && daily2.json?.alreadyCollected === true,
    `alreadyCollected=${daily2.json?.alreadyCollected}`,
  )
  expect(
    'daily collect picks match crystal id across two calls',
    daily1.json?.crystal?.id === daily2.json?.crystal?.id,
    `1st=${daily1.json?.crystal?.id} 2nd=${daily2.json?.crystal?.id}`,
  )

  // Compare daily-collect pick against /api/crystals/today pick
  const todayPremium = await fetchJson('/api/crystals/today', { headers: auth })
  expect(
    'crystals/today and daily/collect pick same stone (picker unification)',
    todayPremium.json?.crystal?.id === daily1.json?.crystal?.id,
    `today=${todayPremium.json?.crystal?.id} collect=${daily1.json?.crystal?.id}`,
  )

  // daily-streak with history
  const streak = await fetchJson('/api/crystals/daily-streak', { headers: auth })
  expect(
    'GET /api/crystals/daily-streak (premium) → 200 + streak + days[]',
    streak.status === 200 &&
      streak.json?.streak &&
      Array.isArray(streak.json?.days) &&
      typeof streak.json?.today === 'string',
    `status=${streak.status} days.length=${streak.json?.days?.length}`,
  )

  // Collect recommendation if one is available
  const firstRec = overview.json?.recommendations?.[0]
  if (firstRec) {
    const collectResult = await fetchJson('/api/crystals/collect', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ recommendationId: firstRec.id }),
    })
    expect(
      'POST /api/crystals/collect (valid rec) → 200 + userCrystal',
      collectResult.status === 200 && collectResult.json?.userCrystal && collectResult.json?.recommendation,
      `status=${collectResult.status}`,
    )

    // Idempotent second call
    const collectAgain = await fetchJson('/api/crystals/collect', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ recommendationId: firstRec.id }),
    })
    expect(
      'POST /api/crystals/collect 2nd call → 404 (already collected)',
      collectAgain.status === 404,
      `status=${collectAgain.status}`,
    )
  } else {
    record('collect rec path', 'skip', 'no recommendations returned (user may have collected all already)')
  }

  // Fake rec → 404
  const fakeRec = await fetchJson('/api/crystals/collect', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ recommendationId: '00000000-0000-0000-0000-000000000000' }),
  })
  expect(
    'POST /api/crystals/collect (nonexistent rec) → 404',
    fakeRec.status === 404,
    `status=${fakeRec.status}`,
  )

  // Chart ownership enforcement — use a dummy chartId from another user
  const { data: otherChart } = await supabase
    .from('charts')
    .select('id')
    .neq('user_id', clerkId)
    .limit(1)
    .maybeSingle()
  if (otherChart?.id) {
    const forbidden = await fetchJson(`/api/transits/overview?chartId=${otherChart.id}`, { headers: auth })
    expect(
      'GET /api/transits/overview (another user chart) → 403 or 404',
      forbidden.status === 403 || forbidden.status === 404,
      `status=${forbidden.status}`,
    )
  } else {
    record('ownership enforcement', 'skip', 'no other-user chart exists to test against')
  }
}

/**
 * Oracle free-tier gate verification.
 *
 * DISABLED 2026-09-07 — this block asserted the pre-2026-09-01 model: a
 * shared 3-per-calendar-month `subscription_quotas` counter, with the cap
 * read from `ORACLE_FREE_MESSAGES_PER_DAY`. The frozen tier definition
 * (.planning/TIER-DEFINITION-2026-09-01.md) replaced that for the FREE
 * tier with ONE `general` reading for the LIFETIME of the account,
 * enforced by `users.free_oracle_used_at` (apps/web/lib/subscriptions/
 * free-oracle.ts) — not a counter, not per-day, not three. Every
 * assertion that was here (pre-seed N `ai_readings` rows, expect 429 at
 * cap===3, expect "not 429 at cap-1") tests removed behaviour, and the
 * `ORACLE_FREE_MESSAGES_PER_DAY` env read was wrong on both axes.
 *
 * REWRITE TARGET (tracked in the 2026-09-07 session report) — assert
 * against the lifetime gate instead:
 *   - free, 1st `general` reading             → 200 (or a real generation)
 *   - free, 2nd `general` reading             → 429, code CAP_REACHED,
 *                                               reason 'free_used', cap 1
 *   - free, topic love|career|health          → 429, reason 'premium_topic'
 *   - free, regenerate of an existing reading → 429, reason 'premium_regenerate'
 *   - premium, 2nd reading                    → NOT gated (subscription_quotas
 *                                               at 300 — impractical to exhaust,
 *                                               just assert it is not 429)
 *   - cleanup: reset `users.free_oracle_used_at = NULL` for the test user
 *     (NOT delete `ai_readings` — that is no longer what the gate reads)
 */
async function clearOracleHistory(clerkId) {
  await supabase.from('ai_readings').delete().eq('user_id', clerkId)
}

async function checkOracleCapGate(_jwt, clerkId, _chartId) {
  record(
    'Oracle free-tier gate',
    'skip',
    'harness block stale vs the frozen tier definition (2026-09-01): FREE is now ONE lifetime `general` reading via users.free_oracle_used_at, not a 3/month counter. Rewrite pending — see this function\'s header and the 2026-09-07 session report.',
  )
  // Best-effort: leave the test user in a known-clean state regardless.
  await clearOracleHistory(clerkId)
  await setTier(clerkId, 'free')
}

/**
 * §8.4 integration check: real Clerk-authenticated CRUD against the
 * diary API against prod Supabase. Exercises the full stack — Clerk
 * auth() middleware extracts sub → route handler calls core →
 * service-role Supabase client writes with explicit .eq(user_id).
 * Also exercises RLS policies indirectly: the UNAUTH_ENDPOINTS list
 * above asserts 401s for anonymous callers, and this auth'd flow
 * confirms the row actually lands with the expected user_id and is
 * visible on the caller's GET list (and not on anyone else's — the
 * .eq scoping + RLS combined guarantee).
 *
 * §8.4 commit-7 discipline: if ANY of these assertions fails, stop
 * and surface. Failure is a diagnosis event (JWT claim extraction,
 * RLS policy-vs-JWT-shape mismatch, or Clerk config), not a patch
 * event. Guessing the layer without evidence will compound the bug.
 */
async function checkDiaryCrudFlow(jwt, clerkId) {
  console.log('\n== Diary CRUD (auth\'d, §8.4 integration) ==')
  const auth = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }
  const today = new Date().toISOString().slice(0, 10)

  // POST: first write of the day — should create a new row.
  const createBody = {
    entryDate: today,
    phaseId: 'new',
    phaseName: 'Новолуние',
    intentions: [
      'Отварям място за яснота.',
      'Поставям три намерения за цикъла.',
      'Слушам какво е готово да се роди.',
    ],
  }
  const create = await fetchJson('/api/diary/entries', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify(createBody),
  })
  if (!expect(
    'POST /api/diary/entries → 200 + {created:true} + user_id matches clerkId',
    create.status === 200 &&
      create.json?.id &&
      create.json.user_id === clerkId &&
      create.json.created === true &&
      create.json.entry_date === today &&
      Array.isArray(create.json.intentions) &&
      create.json.intentions.length === 3,
    `status=${create.status} id=${create.json?.id} user_id=${create.json?.user_id} created=${create.json?.created}`,
  )) return null
  const entryId = create.json.id

  // Validation failure branch — empty body should 400 with details.
  const badCreate = await fetchJson('/api/diary/entries', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({}),
  })
  expect(
    'POST /api/diary/entries (bad input) → 400 + details{}',
    badCreate.status === 400 && typeof badCreate.json?.details === 'object',
    `status=${badCreate.status}`,
  )

  // GET list — new entry should appear.
  const list = await fetchJson('/api/diary/entries', { headers: auth })
  expect(
    'GET /api/diary/entries → 200 + array containing entryId',
    list.status === 200 &&
      Array.isArray(list.json) &&
      list.json.some((e) => e.id === entryId),
    `status=${list.status} len=${list.json?.length}`,
  )

  // GET single — entry should be readable by id.
  const getOne = await fetchJson(`/api/diary/entries/${entryId}`, { headers: auth })
  expect(
    `GET /api/diary/entries/${entryId} → 200 + row`,
    getOne.status === 200 && getOne.json?.id === entryId,
    `status=${getOne.status}`,
  )

  // GET non-existent — 404 with Bulgarian body.
  const getMissing = await fetchJson(
    '/api/diary/entries/00000000-0000-0000-0000-000000000000',
    { headers: auth },
  )
  expect(
    'GET /api/diary/entries/<nonexistent> → 404',
    getMissing.status === 404 && getMissing.json?.error?.includes('не беше намерена'),
    `status=${getMissing.status}`,
  )

  // POST same (user_id, today) again — upsert UPDATE path. Row id and
  // created_at should stay the same; created should flip to false.
  const upsertAgain = await fetchJson('/api/diary/entries', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      ...createBody,
      intentions: [
        'Обновено намерение едно.',
        'Обновено намерение две.',
        'Обновено намерение три.',
      ],
    }),
  })
  expect(
    'POST /api/diary/entries (same day) → 200 + {created:false} + same id',
    upsertAgain.status === 200 &&
      upsertAgain.json?.id === entryId &&
      upsertAgain.json.created === false &&
      upsertAgain.json.intentions?.[0] === 'Обновено намерение едно.',
    `status=${upsertAgain.status} id=${upsertAgain.json?.id} created=${upsertAgain.json?.created}`,
  )

  // Verify UNIQUE (user_id, entry_date) maintains single row via service role.
  const { data: rows } = await supabase
    .from('diary_entries')
    .select('id')
    .eq('user_id', clerkId)
    .eq('entry_date', today)
  expect(
    'diary_entries UNIQUE(user_id, entry_date) holds — single row for (user, today)',
    (rows?.length ?? 0) === 1 && rows[0].id === entryId,
    `rows=${rows?.length} ids=[${rows?.map((r) => r.id).join(',')}]`,
  )

  // PATCH — intentions update.
  const patch = await fetchJson(`/api/diary/entries/${entryId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({
      intentions: [
        'Final patch one.',
        'Final patch two.',
        'Final patch three.',
      ],
    }),
  })
  expect(
    'PATCH /api/diary/entries/<id> → 200 + intentions updated',
    patch.status === 200 && patch.json?.intentions?.[0] === 'Final patch one.',
    `status=${patch.status}`,
  )

  // Invalid PATCH (wrong tuple length) → 400.
  const badPatch = await fetchJson(`/api/diary/entries/${entryId}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ intentions: ['only one'] }),
  })
  expect(
    'PATCH /api/diary/entries (bad input) → 400 + details{}',
    badPatch.status === 400 && typeof badPatch.json?.details === 'object',
    `status=${badPatch.status}`,
  )

  // DELETE — 204 no body.
  const del = await fetchJson(`/api/diary/entries/${entryId}`, {
    method: 'DELETE',
    headers: auth,
  })
  expect(
    'DELETE /api/diary/entries/<id> → 204',
    del.status === 204,
    `status=${del.status}`,
  )

  // GET after delete → 404.
  const getAfterDelete = await fetchJson(`/api/diary/entries/${entryId}`, {
    headers: auth,
  })
  expect(
    'GET /api/diary/entries/<deleted-id> → 404',
    getAfterDelete.status === 404,
    `status=${getAfterDelete.status}`,
  )

  return entryId
}

async function pickerDivergenceAnalysis() {
  console.log('\n== Crystal picker divergence analysis ==')
  const { data: catalog } = await supabase
    .from('crystals')
    .select('slug, moon_phases')
    .order('slug', { ascending: true })

  if (!catalog || catalog.length === 0) {
    record('picker divergence analysis', 'skip', 'empty crystals catalog')
    return
  }

  const phases = [
    'new',
    'waxing_crescent',
    'first_quarter',
    'waxing_gibbous',
    'full',
    'waning_gibbous',
    'last_quarter',
    'waning_crescent',
  ]
  // Pre-M3 POST picks matches[0] from the unsorted filter result.
  // Post-M3 (and the GET path via getCrystalOfTheDay) re-sorts by slug,
  // then picks matches[daysSinceEpochUTC(today) % matches.length].
  // Divergence for TODAY: compare the two picks for each phase.
  const todayIso = new Date().toISOString().slice(0, 10)
  const daysSinceEpoch = Math.floor(new Date(`${todayIso}T00:00:00Z`).getTime() / 86400000)

  const multiMatch = []
  for (const ph of phases) {
    const matches = catalog.filter((c) => c.moon_phases.includes(ph))
    if (matches.length <= 1) {
      multiMatch.push({ phase: ph, matches: matches.length, note: 'single-match — no divergence possible' })
      continue
    }
    const sortedBySlug = [...matches].sort((a, b) => a.slug.localeCompare(b.slug))
    const preM3Pick = matches[0]?.slug
    const postM3Idx = daysSinceEpoch % matches.length
    const postM3Pick = sortedBySlug[postM3Idx]?.slug
    multiMatch.push({
      phase: ph,
      matches: matches.length,
      preM3_pick_today: preM3Pick,
      postM3_pick_today: postM3Pick,
      diverges_today: preM3Pick !== postM3Pick,
      postM3_idx_today: postM3Idx,
    })
  }
  const divergedToday = multiMatch.filter((m) => m.diverges_today).length
  record(
    'picker divergence analysis completed',
    'pass',
    `multi-match phases: ${multiMatch.filter((m) => m.matches > 1).length} of 8; pre-M3 vs post-M3 pick would diverge TODAY for ${divergedToday} of them`,
  )
  return multiMatch
}

// ───────────────────────────────────────────────────────────────────────
// §8.9 additions — diary persistence verification round.
// Pure-function blocks (rotation, markdown) import .ts source directly;
// Node 24's built-in type-strip makes that work since both modules use
// `import type` only (no runtime path-alias resolution needed).
// API blocks (GDPR export shape, GDPR cascade) hit the dev server like
// the rest of the harness. Cascade is env-gated on CRON_SECRET and
// uses a dedicated throwaway Clerk user — destructive op, full
// isolation from the shared TEST_EMAIL flow.
// ───────────────────────────────────────────────────────────────────────

async function checkRotationMath() {
  console.log('\n== Diary prompt rotation math (pure-function, no API) ==')
  const { getManifestPrompt, MANIFEST_PROMPTS } = await import(
    '../lib/manifest/prompts.ts'
  )

  const variantCounts = Object.fromEntries(
    Object.entries(MANIFEST_PROMPTS).map(([k, v]) => [k, v.length]),
  )
  expect(
    'MANIFEST_PROMPTS shape — 7 phases × 3 variants + last_quarter × 2',
    variantCounts.new === 3 &&
      variantCounts.waxing_crescent === 3 &&
      variantCounts.first_quarter === 3 &&
      variantCounts.waxing_gibbous === 3 &&
      variantCounts.full === 3 &&
      variantCounts.waning_gibbous === 3 &&
      variantCounts.last_quarter === 2 &&
      variantCounts.waning_crescent === 3,
    `counts=${JSON.stringify(variantCounts)}`,
  )

  // 3-variant rotation against the `new` phase: distinct headings for
  // 0/1/2, then variant-0 returns at 3 (one wrap) and 6 (two wraps).
  const new0 = getManifestPrompt('new', 0)
  const new1 = getManifestPrompt('new', 1)
  const new2 = getManifestPrompt('new', 2)
  const new3 = getManifestPrompt('new', 3)
  const new6 = getManifestPrompt('new', 6)
  expect(
    'rotation 3-variant: new — entry-count N → variants[N % 3]',
    new0.heading !== new1.heading &&
      new1.heading !== new2.heading &&
      new0.heading !== new2.heading &&
      new3.heading === new0.heading &&
      new6.heading === new0.heading,
    `0:"${new0.heading}" 1:"${new1.heading}" 2:"${new2.heading}" 3:"${new3.heading}" 6:"${new6.heading}"`,
  )

  // 2-variant rotation against last_quarter: 0/1 distinct, then variant-0
  // returns at 2 (one wrap) and 4 (two wraps).
  const lq0 = getManifestPrompt('last_quarter', 0)
  const lq1 = getManifestPrompt('last_quarter', 1)
  const lq2 = getManifestPrompt('last_quarter', 2)
  const lq4 = getManifestPrompt('last_quarter', 4)
  expect(
    'rotation 2-variant: last_quarter — entry-count N → variants[N % 2]',
    lq0.heading !== lq1.heading &&
      lq2.heading === lq0.heading &&
      lq4.heading === lq0.heading,
    `0:"${lq0.heading}" 1:"${lq1.heading}" 2:"${lq2.heading}" 4:"${lq4.heading}"`,
  )

  // Every phase: large entry count maps cleanly back to variant-0 when
  // count is divisible by variant length. Catches off-by-one drift.
  let rotationOk = true
  const drift = []
  for (const [phase, variants] of Object.entries(MANIFEST_PROMPTS)) {
    const v0 = getManifestPrompt(phase, 0)
    const wrapped = getManifestPrompt(phase, variants.length * 5)
    if (v0.heading !== wrapped.heading) {
      rotationOk = false
      drift.push(`${phase}: v0="${v0.heading}" wrapped="${wrapped.heading}"`)
    }
  }
  expect(
    'rotation invariant: getManifestPrompt(phase, k * variants.length).heading === variants[0].heading for all 8 phases',
    rotationOk,
    rotationOk ? '8/8 phases wrap cleanly' : drift.join('; '),
  )
}

async function checkMarkdownExport() {
  console.log('\n== Diary markdown export (pure-function, no API) ==')
  const { buildDiaryMarkdown, buildDiaryFilename } = await import(
    '../lib/diary/export.ts'
  )

  const exportedAt = new Date('2026-04-26T12:00:00Z')
  const sampleEntries = [
    {
      id: 'e1',
      date: '2026-04-25',
      phaseName: 'Новолуние',
      intentions: ['Първо', 'Второ', 'Трето'],
    },
    {
      id: 'e2',
      date: '2026-04-26',
      phaseName: 'Растяща сърп',
      intentions: ['А', 'Б', 'В'],
    },
  ]
  const md = buildDiaryMarkdown(sampleEntries, exportedAt)

  expect(
    'markdown export starts with UTF-8 BOM (U+FEFF)',
    md.charCodeAt(0) === 0xfeff,
    `first-codepoint=0x${md.charCodeAt(0).toString(16)}`,
  )
  expect(
    'markdown export contains "# Лунен дневник" title',
    md.includes('# Лунен дневник'),
    null,
  )
  expect(
    'markdown export contains Bulgarian long-form export-date line ("Изтеглен на ... г.")',
    md.includes('Изтеглен на ') && md.includes(' г.'),
    null,
  )
  expect(
    'markdown export uses U+00B7 MIDDLE DOT separator (not bullet/em-dash)',
    md.includes(' · ') && !md.includes(' • ') && !md.includes(' — '),
    null,
  )
  expect(
    'markdown export numbers intentions I./II./III. for each entry',
    md.includes('I. Първо') &&
      md.includes('II. Второ') &&
      md.includes('III. Трето') &&
      md.includes('I. А') &&
      md.includes('II. Б') &&
      md.includes('III. В'),
    null,
  )
  expect(
    'markdown export includes both entries\' phase names',
    md.includes('Новолуние') && md.includes('Растяща сърп'),
    null,
  )

  const filename = buildDiaryFilename(exportedAt)
  expect(
    'buildDiaryFilename → stellaeum-дневник-YYYY-MM-DD.md',
    /^stellaeum-дневник-\d{4}-\d{2}-\d{2}\.md$/.test(filename),
    `filename=${filename}`,
  )
}

async function checkGdprExportShape(jwt, clerkId) {
  console.log('\n== GDPR export shape (diaryEntries array) ==')
  const auth = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }
  const today = new Date().toISOString().slice(0, 10)

  // checkDiaryCrudFlow deletes its own entry at the end, so seed a fresh
  // one here. The trailing cleanup() will sweep this row alongside the
  // rest of the test user's data.
  const create = await fetchJson('/api/diary/entries', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({
      entryDate: today,
      phaseId: 'new',
      phaseName: 'Новолуние',
      intentions: [
        'GDPR shape probe — намерение 1.',
        'GDPR shape probe — намерение 2.',
        'GDPR shape probe — намерение 3.',
      ],
    }),
  })
  if (!expect(
    'GDPR setup: POST /api/diary/entries → 200 with id',
    create.status === 200 && create.json?.id,
    `status=${create.status}`,
  )) return
  const entryId = create.json.id

  const exp = await fetchJson('/api/gdpr/export', { headers: auth })
  expect(
    'GET /api/gdpr/export → 200 + diaryEntries array',
    exp.status === 200 && Array.isArray(exp.json?.diaryEntries),
    `status=${exp.status} diaryEntries-type=${Array.isArray(exp.json?.diaryEntries) ? 'array' : typeof exp.json?.diaryEntries}`,
  )
  expect(
    'GDPR export.diaryEntries contains the just-created entry id',
    Array.isArray(exp.json?.diaryEntries) &&
      exp.json.diaryEntries.some((e) => e.id === entryId),
    `entries=${exp.json?.diaryEntries?.length ?? 0} probe_id=${entryId}`,
  )
  expect(
    'GDPR export shape — exportedAt + user + charts + aiReadings + dailyHoroscopes + diaryEntries',
    exp.json &&
      typeof exp.json.exportedAt === 'string' &&
      'user' in exp.json &&
      Array.isArray(exp.json.charts) &&
      Array.isArray(exp.json.aiReadings) &&
      Array.isArray(exp.json.dailyHoroscopes) &&
      Array.isArray(exp.json.diaryEntries),
    `keys=${exp.json ? Object.keys(exp.json).sort().join(',') : 'null'}`,
  )
}

async function checkGdprCascadeSmoke() {
  console.log('\n== GDPR cascade smoke (env-gated on CRON_SECRET) ==')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    record(
      'gdpr cascade smoke',
      'skip',
      'CRON_SECRET not set — pre-launch sweep should export it before running the harness',
    )
    return
  }

  const cascadeEmail =
    process.env.UAT_CASCADE_EMAIL ?? 'm3uat-cascade@celestia-ai.dev'
  let cascadeUserId = null
  try {
    const cascadeUser = await ensureClerkUser(cascadeEmail)
    cascadeUserId = cascadeUser.id
    await ensureUserRow(cascadeUser.id, 'free')
    const { jwt: cascadeJwt } = await mintSessionToken(cascadeUser.id)
    const cascadeAuth = {
      Authorization: `Bearer ${cascadeJwt}`,
      'Content-Type': 'application/json',
    }

    // Seed a diary entry so the cascade has cross-table state to delete.
    // Assert the seed succeeded — without this gate, the downstream
    // diary_entries → 0 rows assertion would pass trivially if the seed
    // silently failed (the cascade would have nothing to delete, and
    // the count would be 0 for the wrong reason).
    const today = new Date().toISOString().slice(0, 10)
    const seed = await fetchJson('/api/diary/entries', {
      method: 'POST',
      headers: cascadeAuth,
      body: JSON.stringify({
        entryDate: today,
        phaseId: 'new',
        phaseName: 'Новолуние',
        intentions: [
          'cascade probe — намерение 1.',
          'cascade probe — намерение 2.',
          'cascade probe — намерение 3.',
        ],
      }),
    })
    if (!expect(
      'cascade setup: POST /api/diary/entries → 200 with id (seed for cascade verification)',
      seed.status === 200 && seed.json?.id,
      `status=${seed.status}`,
    )) return

    // Back-date deletion_scheduled_at past now so the cron's
    // `.lte('deletion_scheduled_at', now)` filter picks this user up.
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    await supabase
      .from('users')
      .update({ deletion_scheduled_at: yesterday })
      .eq('clerk_id', cascadeUser.id)

    // Trigger the cron — endpoint is GET (not POST) per route.ts:13.
    const cronRes = await fetchJson('/api/cron/cleanup-deleted-accounts', {
      headers: { Authorization: `Bearer ${cronSecret}` },
    })
    expect(
      'GET /api/cron/cleanup-deleted-accounts → 200 + deleted ≥ 1',
      cronRes.status === 200 &&
        typeof cronRes.json?.deleted === 'number' &&
        cronRes.json.deleted >= 1,
      `status=${cronRes.status} body=${JSON.stringify(cronRes.json)}`,
    )

    // Service-role verification — diary_entries gone for this user.
    const { count: diaryCount } = await supabase
      .from('diary_entries')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', cascadeUser.id)
    expect(
      'cascade verified: diary_entries for cascade-user → 0 rows',
      (diaryCount ?? -1) === 0,
      `diary_count=${diaryCount}`,
    )

    // Service-role verification — users row gone.
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('clerk_id', cascadeUser.id)
    expect(
      'cascade verified: users row for cascade-user → 0 rows',
      (userCount ?? -1) === 0,
      `user_count=${userCount}`,
    )

    // Service-role verification — Clerk account gone (cron also calls
    // clerk.users.deleteUser, per route.ts:107-108).
    let clerkStillExists = false
    try {
      await clerkFetch(`/users/${cascadeUser.id}`)
      clerkStillExists = true
    } catch {
      clerkStillExists = false
    }
    expect(
      'cascade verified: Clerk user deleted by cron',
      !clerkStillExists,
      `clerk_user_${cascadeUser.id}_still_exists=${clerkStillExists}`,
    )

    cascadeUserId = null  // Cascade ran clean — skip defensive cleanup.
  } finally {
    // Defensive cleanup if cascade didn't fully run (assertion failed
    // mid-flow, exception thrown, etc.). Best-effort; tolerant of
    // already-deleted state.
    if (cascadeUserId) {
      try {
        await supabase.from('diary_entries').delete().eq('user_id', cascadeUserId)
        await supabase.from('users').delete().eq('clerk_id', cascadeUserId)
        await clerkFetch(`/users/${cascadeUserId}`, { method: 'DELETE' }).catch(() => {})
      } catch {
        // Swallow — defensive only.
      }
    }
  }
}

async function cleanup(chartId, clerkId) {
  console.log('\n== Cleanup ==')
  if (chartId) {
    await supabase.from('ai_readings').delete().eq('chart_id', chartId)
    await supabase.from('chart_calculations').delete().eq('chart_id', chartId)
    await supabase.from('charts').delete().eq('id', chartId)
  }
  await supabase.from('ai_readings').delete().eq('user_id', clerkId)
  await supabase.from('user_daily_crystals').delete().eq('user_id', clerkId)
  await supabase.from('user_crystals').delete().eq('user_id', clerkId)
  await supabase
    .from('crystal_recommendations')
    .delete()
    .eq('user_id', clerkId)
  await supabase.from('diary_entries').delete().eq('user_id', clerkId)
  await setTier(clerkId, 'free')
  record('cleanup', 'pass', 'test chart, ai_readings, daily crystals, user_crystals, recs, diary entries deleted; tier → free')
}

async function main() {
  throw new Error(
    'm3-uat-harness is out of date as of B.0f-2 quota refactor (2026-05-10). ' +
      'Cap mechanism migrated from ai_readings row-counting to subscription_quotas table. ' +
      'See REVISIT-35 for harness disposition (rewrite vs delete) — pending test layer evaluation.',
  )

  console.log(`M3 UAT harness — ${new Date().toISOString()}`)
  console.log(`Base URL: ${BASE_URL}`)

  // Wait a moment for dev server
  let healthy = false
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(BASE_URL + '/api/planets/current')
      if (res.status === 200) {
        healthy = true
        break
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 2000))
  }
  if (!healthy) {
    console.error('Dev server never became ready at ' + BASE_URL)
    process.exit(3)
  }

  const user = await ensureClerkUser()
  console.log(`Clerk user: ${user.id} (${user.emailAddresses?.[0]?.emailAddress})`)
  await ensureUserRow(user.id, 'free')

  const { jwt } = await mintSessionToken(user.id)
  console.log(`Session JWT minted (len=${jwt?.length ?? 0})`)

  await warmRoutes([
    '/api/planets/current',
    '/api/birth-data',
    '/api/chart/calculate',
    '/api/crystals',
    '/api/crystals/today',
    '/api/crystals/collect',
    '/api/crystals/daily/collect',
    '/api/crystals/daily-streak',
    '/api/stripe/status',
    '/api/transits/overview',
  ])

  await checkUnauthGates()
  await checkProtectedPageRedirects()
  await checkSubscriptionSuccessRedirectUrl()
  await checkPublicPagesStayPublic()
  await checkPublicHappyPaths()
  const chartId = await checkAuthHappyPaths(jwt, user.id)
  if (chartId) {
    await checkPremiumPaths(jwt, user.id, chartId)
  } else {
    record('premium paths', 'skip', 'chart creation failed, cannot run premium flows')
  }
  if (chartId) await checkOracleCapGate(jwt, user.id, chartId)
  await checkDiaryCrudFlow(jwt, user.id)
  const multiMatch = await pickerDivergenceAnalysis()
  await checkRotationMath()
  await checkMarkdownExport()
  await checkGdprExportShape(jwt, user.id)
  if (chartId) await cleanup(chartId, user.id)
  await checkGdprCascadeSmoke()

  console.log(`\n== Summary ==`)
  console.log(`pass: ${pass} / fail: ${fail} / total: ${results.length}`)

  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    clerkUserId: user.id,
    pass,
    fail,
    results,
    multiMatch,
  }
  await writeFile(
    join(__dirname, '..', '..', '..', '.planning', 'phases', 'm3-uat', 'RESULTS.json'),
    JSON.stringify(summary, null, 2),
  )
  process.exit(fail > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error('Harness crashed:', err)
  process.exit(4)
})
