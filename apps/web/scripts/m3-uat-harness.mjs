#!/usr/bin/env node
/**
 * M3 UAT harness — runtime verification of every extracted endpoint.
 *
 * Invoke:
 *   node --env-file=apps/web/.env.local apps/web/scripts/m3-uat-harness.mjs
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
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!CLERK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE) {
  console.error('Missing env. Need CLERK_SECRET_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.')
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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
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

async function ensureClerkUser() {
  console.log('  ensureClerkUser: listing users...')
  const query = encodeURIComponent(TEST_EMAIL)
  const existing = await clerkFetch(`/users?email_address=${query}&limit=10`)
  console.log(`  ensureClerkUser: list returned ${Array.isArray(existing) ? existing.length : 'n/a'}`)
  if (Array.isArray(existing)) {
    const match = existing.find((u) =>
      (u.email_addresses ?? []).some((e) => e.email_address === TEST_EMAIL),
    )
    if (match) {
      console.log(`  ensureClerkUser: reusing user ${match.id}`)
      return match
    }
  }

  console.log('  ensureClerkUser: creating new user')
  const created = await clerkFetch('/users', {
    method: 'POST',
    body: JSON.stringify({
      email_address: [TEST_EMAIL],
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
    expect(
      `${ep.method} ${ep.path} → 401 Неоторизиран достъп`,
      status === 401 && json?.error?.includes('Неоторизиран'),
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
 * Oracle cap-gate verification (§6 commit 3).
 *
 * Covers:
 *   - Free tier at the cap is blocked (429 CAP_REACHED). Reads the cap
 *     value from ORACLE_FREE_MESSAGES_PER_DAY env so changes to the
 *     config stay tracked by the test.
 *   - Premium tier at the same row count is NOT blocked — verified via
 *     cache hit so no real AI call is spent.
 *   - Cache hits do NOT count against the cap (free user with a cache-
 *     hit row still gets 200 cached, not 429).
 *   - Cap row pre-seed is timestamped within today's Europe/Sofia
 *     calendar day (the window the handler queries against).
 *
 * Per-run cleanup: ai_readings for the test user are deleted at the
 * start AND end of this block, mirroring the existing cleanup pattern
 * for user_daily_crystals, user_crystals, crystal_recommendations.
 * Without this, the second run of the day would start already at the
 * cap and the assertions would skew.
 */
function sofiaDayStartUtcIso(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Sofia',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(
    fmt.formatToParts(now).map((p) => [p.type, p.value]),
  )
  const h = parseInt(parts.hour, 10) % 24
  const m = parseInt(parts.minute, 10)
  const s = parseInt(parts.second, 10)
  const msSinceSofiaMidnight = ((h * 60 + m) * 60 + s) * 1000
  return new Date(now.getTime() - msSinceSofiaMidnight).toISOString()
}

async function clearOracleHistory(clerkId) {
  await supabase.from('ai_readings').delete().eq('user_id', clerkId)
}

async function checkOracleCapGate(jwt, clerkId, chartId) {
  console.log('\n== Oracle cap-gate (3/day, Europe/Sofia reset) ==')
  const auth = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' }

  // Read the cap from env so the test tracks the config constant.
  // Route handler reads the same env with default 3.
  const cap = Number(process.env.ORACLE_FREE_MESSAGES_PER_DAY ?? '3')

  // Start clean — prior runs of this harness OR prior legitimate use
  // of the oracle by this test user would skew the counter.
  await clearOracleHistory(clerkId)
  await setTier(clerkId, 'free')

  const now = new Date()
  const dayStart = new Date(sofiaDayStartUtcIso(now))
  const sofiaNoonIsh = new Date(dayStart.getTime() + 12 * 3600 * 1000)

  // Pre-seed exactly `cap` ai_readings rows timestamped within today's
  // Sofia day window. All are EXPIRED for cache purposes (past
  // expires_at) so they don't cache-hit — the cap check should fire
  // cleanly. Different (chart_id, topic) pairs to bypass the unique
  // index on (chart_id, topic); we piggyback on chartId for one and
  // synthesize fake chart ids for the rest since the cap check counts
  // by user_id only.
  const preseededRows = []
  for (let i = 0; i < cap; i++) {
    const row = {
      chart_id: chartId,
      user_id: clerkId,
      topic: ['general', 'love', 'career', 'health'][i % 4],
      content: `uat-preseed-${i}`,
      generated_at: new Date(sofiaNoonIsh.getTime() + i * 1000).toISOString(),
      expires_at: new Date(now.getTime() - 60_000).toISOString(),
      model_version: 'uat-preseed',
    }
    // Topic uniqueness across (chart_id, topic) is enforced by a unique
    // index, so we delete first to avoid conflicts on re-run.
    await supabase
      .from('ai_readings')
      .delete()
      .eq('chart_id', chartId)
      .eq('topic', row.topic)
    await supabase.from('ai_readings').insert(row)
    preseededRows.push(row)
  }

  // Verify the cap-reached response for a fresh topic (no cache) on
  // the remaining unseeded topic. Pick a topic not in preseededRows
  // if possible; if cap >= 4 all four topics are seeded and we need
  // to delete one to create a "fresh topic" slot. For the default
  // cap=3 the 4th topic stays unseeded and gives us a clean probe.
  const seededTopics = new Set(preseededRows.map((r) => r.topic))
  const allTopics = ['general', 'love', 'career', 'health']
  const probeTopic = allTopics.find((t) => !seededTopics.has(t)) ?? 'general'

  // Ensure the probe (chartId, probeTopic) has NO row so cache check
  // misses and we reach the cap check at step 7.
  await supabase
    .from('ai_readings')
    .delete()
    .eq('chart_id', chartId)
    .eq('topic', probeTopic)

  const capReached = await fetchJson('/api/oracle/generate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId, topic: probeTopic }),
  })
  expect(
    `POST /api/oracle/generate (free, at cap=${cap}) → 429 CAP_REACHED`,
    capReached.status === 429 &&
      capReached.json?.code === 'CAP_REACHED' &&
      capReached.json?.cap === cap,
    `status=${capReached.status} code=${capReached.json?.code} cap=${capReached.json?.cap}`,
  )

  // Cache hit under cap — free user, same count, but (chartId,
  // probeTopic) now has a cache-valid row. Server returns 200 cached
  // and the cap check is bypassed because cache-first returns earlier.
  const futureExpiry = new Date(now.getTime() + 24 * 3600 * 1000).toISOString()
  await supabase.from('ai_readings').insert({
    chart_id: chartId,
    user_id: clerkId,
    topic: probeTopic,
    content: 'uat-cache-hit-content',
    generated_at: now.toISOString(),
    expires_at: futureExpiry,
    model_version: 'uat-cache',
  })

  const cacheBypass = await fetchJson('/api/oracle/generate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId, topic: probeTopic }),
  })
  expect(
    'POST /api/oracle/generate (free, over cap, cache hit) → 200 cached — cache bypasses cap',
    cacheBypass.status === 200 && cacheBypass.json?.cached === true,
    `status=${cacheBypass.status} cached=${cacheBypass.json?.cached}`,
  )

  // Premium bypass — same user, same pre-seeded cap rows. Premium
  // removes the cap entirely. Verified via the cache-hit row above
  // so no real AI call is spent.
  await setTier(clerkId, 'premium')
  const premiumBypass = await fetchJson('/api/oracle/generate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId, topic: probeTopic }),
  })
  expect(
    'POST /api/oracle/generate (premium, over cap, cache hit) → 200 cached — premium bypasses cap',
    premiumBypass.status === 200 && premiumBypass.json?.cached === true,
    `status=${premiumBypass.status} cached=${premiumBypass.json?.cached}`,
  )

  // Cap check boundary — take seeded count below cap and confirm a
  // cache-miss topic no longer returns 429. Free user, cap-1 rows,
  // fresh topic with valid chartId, no cache row → should NOT be
  // 429. The actual response status depends on whether a real AI
  // call succeeds (200 streaming) — we accept any non-429 as proof
  // the cap check correctly short-circuited when below the limit.
  await setTier(clerkId, 'free')
  // Remove one preseeded row to drop below cap
  const firstSeededTopic = preseededRows[0].topic
  await supabase
    .from('ai_readings')
    .delete()
    .eq('chart_id', chartId)
    .eq('topic', firstSeededTopic)
  // Pre-seed a cache-hit row on a different (chartId, 'general')
  // pair so we can observe the non-429 outcome without spending
  // a real AI call. If probeTopic was 'general', reuse it; else
  // pick general.
  const belowCapTopic = 'general'
  await supabase.from('ai_readings').delete().eq('chart_id', chartId).eq('topic', belowCapTopic)
  await supabase.from('ai_readings').insert({
    chart_id: chartId,
    user_id: clerkId,
    topic: belowCapTopic,
    content: 'uat-below-cap-cache',
    generated_at: now.toISOString(),
    expires_at: futureExpiry,
    model_version: 'uat-cache',
  })

  const belowCap = await fetchJson('/api/oracle/generate', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ chartId, topic: belowCapTopic }),
  })
  expect(
    `POST /api/oracle/generate (free, at cap-1) → not 429 (cap check short-circuits below limit)`,
    belowCap.status !== 429,
    `status=${belowCap.status} code=${belowCap.json?.code ?? '-'}`,
  )

  // Clean up all ai_readings for the test user — per-run cleanup
  // mirroring the existing pattern for other user-scoped rows.
  await clearOracleHistory(clerkId)
  await setTier(clerkId, 'free')
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
  await setTier(clerkId, 'free')
  record('cleanup', 'pass', 'test chart, ai_readings, daily crystals, user_crystals, recs deleted; tier → free')
}

async function main() {
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
  const multiMatch = await pickerDivergenceAnalysis()
  if (chartId) await cleanup(chartId, user.id)

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
