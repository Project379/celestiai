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
    expect(
      `${ep.method} ${ep.path} → 401`,
      status === 401 && (json?.error?.includes('Неоторизиран') || json?.error === 'Unauthorized'),
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

async function checkProtectedPageRedirects() {
  console.log('\n== Protected page routes redirect anon → /sign-in ==')
  for (const route of PROTECTED_PAGE_ROUTES) {
    const { status, location } = await fetchNoFollow(route)
    const is3xx = status >= 300 && status < 400
    const redirectsToSignIn = (location ?? '').includes('/sign-in')
    expect(
      `GET ${route} (anon) → 3xx to /sign-in`,
      is3xx && redirectsToSignIn,
      `status=${status} location=${location?.slice(0, 100)}`,
    )
  }
}

async function checkSubscriptionSuccessRedirectUrl() {
  // Stripe redirects the user to /subscription/success?session_id=cs_test_xxx
  // after Checkout. The fix in 531c9f8 routes that URL through Clerk
  // middleware (not the layout redirect) so the redirect_url query param
  // round-trips the full original path + query string. Without round-
  // tripping the session_id, activatePremiumFromSession never runs and
  // premium activation waits on the async webhook.
  console.log('\n== Stripe session_id round-trips through sign-in bounce ==')
  const sessionIdProbe = 'cs_test_uat_session_id_probe'
  const originalPath = `/subscription/success?session_id=${sessionIdProbe}`
  const { status, location } = await fetchNoFollow(originalPath)
  const is3xx = status >= 300 && status < 400

  let redirectsToSignIn = false
  let redirectUrlValue = null
  if (location) {
    try {
      const parsed = new URL(location, BASE_URL)
      redirectsToSignIn = parsed.pathname === '/sign-in'
      redirectUrlValue = parsed.searchParams.get('redirect_url')
    } catch {}
  }

  const preservesPath = redirectUrlValue?.includes('/subscription/success')
  const preservesSessionId = redirectUrlValue?.includes(sessionIdProbe)

  expect(
    'GET /subscription/success?session_id=… (anon) → 3xx to /sign-in with redirect_url preserving path + session_id',
    is3xx && redirectsToSignIn && preservesPath && preservesSessionId,
    `status=${status} redirect_url=${redirectUrlValue?.slice(0, 140)}`,
  )
}

async function checkPublicPagesStayPublic() {
  // Inverse assertion — catches a future matcher widening that accidentally
  // sweeps marketing / auth-landing pages into protection and breaks the
  // conversion funnel (anon visitors redirected away from /pricing, /,
  // /sign-in, /sign-up before they can sign up).
  console.log('\n== Public page routes stay public ==')
  for (const route of PUBLIC_PAGE_ROUTES) {
    const { status, location } = await fetchNoFollow(route)
    const redirectsToSignIn = (location ?? '').includes('/sign-in')
    expect(
      `GET ${route} (anon) → 200 (NOT redirected to /sign-in)`,
      status === 200 || (status >= 300 && status < 400 && !redirectsToSignIn),
      `status=${status} location=${location?.slice(0, 80) ?? '-'}`,
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

  // Free-tier crystals-today (auto-collect only for premium, so free just gets rotation)
  const today = await fetchJson('/api/crystals/today', { headers: auth })
  expect(
    'GET /api/crystals/today (free) → 200 + crystal + isPremium:false',
    today.status === 200 && today.json?.crystal?.slug && today.json?.isPremium === false,
    `status=${today.status} isPremium=${today.json?.isPremium}`,
  )

  // Free-tier premium-gated endpoints → 403
  const crystalsGet = await fetchJson('/api/crystals', { headers: auth })
  expect(
    'GET /api/crystals (free) → 403 PREMIUM_REQUIRED',
    crystalsGet.status === 403 && crystalsGet.json?.code === 'PREMIUM_REQUIRED',
    `status=${crystalsGet.status} code=${crystalsGet.json?.code}`,
  )

  const transitsFree = await fetchJson(`/api/transits/overview?chartId=${chartId}`, { headers: auth })
  expect(
    'GET /api/transits/overview (free) → 403 PREMIUM_REQUIRED',
    transitsFree.status === 403 && transitsFree.json?.code === 'PREMIUM_REQUIRED',
    `status=${transitsFree.status} code=${transitsFree.json?.code}`,
  )

  const dailyCollectFree = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  expect(
    'POST /api/crystals/daily/collect (free) → 403',
    dailyCollectFree.status === 403 && dailyCollectFree.json?.code === 'PREMIUM_REQUIRED',
    `status=${dailyCollectFree.status}`,
  )

  const collectFree = await fetchJson('/api/crystals/collect', {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ recommendationId: '00000000-0000-0000-0000-000000000000' }),
  })
  expect(
    'POST /api/crystals/collect (free) → 403',
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

  // Daily collect (idempotent)
  const daily1 = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  const daily2 = await fetchJson('/api/crystals/daily/collect', {
    method: 'POST',
    headers: auth,
  })
  expect(
    'POST /api/crystals/daily/collect 1st call → 200',
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
    await supabase.from('chart_calculations').delete().eq('chart_id', chartId)
    await supabase.from('charts').delete().eq('id', chartId)
  }
  await supabase.from('user_daily_crystals').delete().eq('user_id', clerkId)
  await supabase.from('user_crystals').delete().eq('user_id', clerkId)
  await supabase
    .from('crystal_recommendations')
    .delete()
    .eq('user_id', clerkId)
  await setTier(clerkId, 'free')
  record('cleanup', 'pass', 'test chart, daily crystals, user_crystals, recs deleted; tier → free')
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
