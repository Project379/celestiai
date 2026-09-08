import * as Sentry from '@sentry/nextjs'
import { calculateNatalChart } from '@stellaeum/astrology'
import { generateFinalText } from '@/lib/ai/generate-final-text'
import { ORACLE_FALLBACK_MODEL } from '@/lib/ai/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/smoke — post-deploy smoke probe (SMOKE-TEST).
 *
 * Bearer-authenticated with SMOKE_SECRET (same shape as the cron routes'
 * CRON_SECRET check). Exercises the three server-side compute dependencies
 * that have no cheap probe of their own — the Swiss Ephemeris native
 * binding, the LLM provider, and Postgres — and reports each as a
 * pass/fail line with a timing. The three cron routes have their own
 * `?probe=1` mode; this route is only for the compute paths.
 *
 * PROBE MARKER: every check runs with side effects OFF (a fixed synthetic
 * natal chart, a 1-sentence throwaway AI prompt, a `limit(1)` select), and
 * the logs it emits are prefixed `[smoke]`. Nothing here writes a row,
 * sends a notification, or touches a real user — a smoke run is meant to
 * be indistinguishable from noise to alerting, not to look like traffic.
 *
 * `?ai=0` (or SMOKE_SKIP_AI=1) skips the AI check — it is the only check
 * that costs money (~€0.003/call) and the only one that needs the Gemini
 * key present in the environment.
 *
 * NOT covered here (tracked in .planning/VERIFICATION-SURFACE-GAPS.md):
 * the /api/oracle/generate and /api/horoscope/generate route wrappers
 * around generateFinalText — Clerk auth, quota claim, prompt-injection
 * sanitising, tier gating, output validation. This probe hits the shared
 * generation core, not those per-route layers.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface Check {
  name: string
  ok: boolean
  ms: number
  detail: string
}

async function timed(name: string, fn: () => Promise<string>): Promise<Check> {
  const start = Date.now()
  try {
    const detail = await fn()
    return { name, ok: true, ms: Date.now() - start, detail }
  } catch (err) {
    return {
      name,
      ok: false,
      ms: Date.now() - start,
      detail: err instanceof Error ? err.message : String(err),
    }
  }
}

function checkEphemeris(): Promise<string> {
  return Promise.resolve().then(() => {
    // Fixed input — Sofia, a known date. Pure function, no DB, no I/O.
    const chart = calculateNatalChart({
      date: new Date('1990-06-15T00:00:00Z'),
      time: '14:30',
      lat: 42.6977,
      lon: 23.3219,
      birthTimeKnown: true,
    })
    const sun = chart.planets.find((p) => p.planet === 'sun') ?? chart.planets[0]
    if (!sun || typeof sun.longitude !== 'number' || Number.isNaN(sun.longitude)) {
      throw new Error('calculateNatalChart returned no usable Sun longitude')
    }
    return `${chart.planets.length} planets, sun ${sun.longitude.toFixed(2)}° (${sun.sign})`
  })
}

async function checkDatabase(): Promise<string> {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase.from('crystals').select('id').limit(1)
  if (error) {
    throw new Error(`Supabase select failed: ${error.message}`)
  }
  return 'crystals select(1) ok'
}

async function checkAi(): Promise<string> {
  // Deliberately English and trivial — the smoke test verifies the
  // provider / model / SDK / structured-output path is alive, not
  // Bulgarian fluency (that is Gate 9's job). A Bulgarian prompt here
  // would also add literals to the check:bg-lint-baseline ratchet for no
  // benefit.
  const { model, text } = await generateFinalText({
    system: 'Reply with exactly the word "ok" and nothing else.',
    prompt: 'Say: ok',
    maxOutputTokens: 200,
    fallbackModel: ORACLE_FALLBACK_MODEL,
  })
  if (!text || text.trim().length === 0) {
    throw new Error('generateFinalText returned empty text')
  }
  return `${model} → ${text.trim().slice(0, 48)}`
}

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization')
  // .trim(): a trailing newline in the pasted Vercel env var is invisible in
  // the dashboard and would break the exact-match check below (SMOKE-TEST).
  const secret = process.env.SMOKE_SECRET?.trim()
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // This whole route is a probe — drop anything Sentry might pick up
  // (see sentry.server.config.ts beforeSend / VERIFICATION-SURFACE-GAPS #11).
  Sentry.getCurrentScope().setTag('probe', 'smoke')

  const url = new URL(req.url)
  const skipAi =
    url.searchParams.get('ai') === '0' || process.env.SMOKE_SKIP_AI === '1'

  const checks: Check[] = []
  checks.push(await timed('ephemeris', checkEphemeris))
  checks.push(await timed('database', checkDatabase))
  if (skipAi) {
    checks.push({ name: 'ai', ok: true, ms: 0, detail: 'skipped (ai=0)' })
  } else {
    checks.push(await timed('ai', checkAi))
  }

  const ok = checks.every((c) => c.ok)
  for (const c of checks) {
    console.log(`[smoke] ${c.name}: ${c.ok ? 'ok' : 'FAIL'} (${c.ms}ms) — ${c.detail}`)
  }

  return Response.json({ probe: true, ok, checks }, { status: ok ? 200 : 503 })
}
