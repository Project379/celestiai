import * as Sentry from '@sentry/nextjs'
import type { ZodiacSign } from '@stellaeum/astrology/client'

import { verifyCronSecret } from '@/lib/auth/cron-secret'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import {
  generateSignMonthText,
  isYearMonth,
  SIGN_KEYS,
  SIGN_MONTH_MODEL,
  usedMarkers,
} from '@/lib/sign-month/generate'
import { nextYearMonth, sofiaDayOfMonth, sofiaYearMonth } from '@/lib/sign-month/month'
import { buildReviewEmail, sendReviewEmail } from '@/lib/sign-month/review-email'

export const dynamic = 'force-dynamic'
// Each sign is one generation plus one editor call (up to 4 tries). Typical total is about 3 minutes
// for 12 signs; the loop stops starting new signs at GENERATE_BUDGET_MS and the next day's run
// (the 24th, 25th and 26th all run) carries on with the signs that are still missing.
export const maxDuration = 300
const GENERATE_BUDGET_MS = 200_000

type Phase = 'generate' | 'publish' | 'idle'

/**
 * GET /api/cron/sign-month
 *
 * Vercel cron, two schedules (see vercel.json): the 24th-26th (GENERATE) and the 1st-3rd (PUBLISH).
 *
 * GENERATE (day 24 and later, for NEXT month): for every sign without a row, write the text
 * (validator + Bulgarian editor pass) and save it as status 'pending', each row as soon as it
 * exists so a timeout loses nothing. Then email the founder all pending texts, each with a veto
 * link, and stamp emailed_at. A sign that fails validation after its retries gets no row and shows
 * its evergreen text.
 *
 * PUBLISH (day 1-3, for the CURRENT month): flip 'pending' to 'published', but ONLY rows the
 * founder was emailed (emailed_at set). If the email never went out the veto window did not
 * happen, so those rows stay pending and the app serves the evergreen text (fail closed).
 * 'rejected' rows are never touched.
 *
 * Users never see 'pending' or 'rejected': GET /api/sign-month serves only 'published'.
 *
 * Query: `?month=YYYY-MM` and `?phase=generate|publish` override what the date decides; `?probe=1`
 * reports what exists and stops (the post-deploy smoke test uses it; it never calls the model and
 * never sends mail).
 */
export async function GET(req: Request) {
  // Bearer-secret authenticity, same as the other crons; not rate-limited for that reason.
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!verifyCronSecret(req.headers.get('Authorization'), cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const probe = url.searchParams.get('probe') === '1'
  const now = new Date()
  const today = sofiaYearMonth(now)
  const day = sofiaDayOfMonth(now)

  const phaseParam = url.searchParams.get('phase')
  const phase: Phase =
    phaseParam === 'generate' || phaseParam === 'publish'
      ? phaseParam
      : day >= 24
        ? 'generate'
        : day <= 3
          ? 'publish'
          : 'idle'
  // The text is written for NEXT month, published for THIS month.
  const requested = url.searchParams.get('month')
  const ym = requested ?? (phase === 'generate' ? nextYearMonth(today) : today)
  if (!isYearMonth(ym)) return Response.json({ error: 'Bad month' }, { status: 400 })
  if (probe) Sentry.getCurrentScope().setTag('probe', 'smoke')

  const supabase = createServiceSupabaseClient()
  const { data: existing, error: readError } = await supabase
    .from('sign_month_texts')
    .select('sign, content, status, emailed_at')
    .eq('year_month', ym)
  // The table does not exist until the migration is applied by hand. For the post-deploy
  // smoke probe that is a WARNING, not a failure: it must not turn production red before
  // the founder applies supabase/migrations/20261009120000_sign_month_texts.sql.
  const tableMissing = readError?.code === '42P01' || readError?.code === 'PGRST205' || readError?.code === '42703'
  if (readError && tableMissing && probe) {
    return Response.json({
      probe: true,
      skipped: true,
      warning:
        'sign_month_texts is missing or outdated: apply supabase/migrations/20261009120000_sign_month_texts.sql by hand (never db push), then supabase migration repair --status applied 20261009120000',
    })
  }
  if (readError) {
    Sentry.captureException(readError, { extra: { context: 'GET /api/cron/sign-month: read existing' } })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }

  const rows = existing ?? []
  const have = new Set(rows.map((r) => r.sign as string))
  const missing = SIGN_KEYS.filter((s) => !have.has(s))
  const count = (status: string) => rows.filter((r) => r.status === status).length
  if (probe) {
    return Response.json({
      probe: true,
      phase,
      month: ym,
      existing: have.size,
      missing: missing.length,
      pending: count('pending'),
      published: count('published'),
      rejected: count('rejected'),
      notEmailed: rows.filter((r) => r.status === 'pending' && !r.emailed_at).length,
    })
  }

  if (phase === 'idle') return Response.json({ phase, month: ym, note: 'nothing to do today' })

  // ---- PUBLISH -------------------------------------------------------------------------------
  if (phase === 'publish') {
    const { data: published, error } = await supabase
      .from('sign_month_texts')
      .update({ status: 'published', published_at: new Date().toISOString() })
      .eq('year_month', ym)
      .eq('status', 'pending')
      .not('emailed_at', 'is', null)
      .select('sign')
    if (error) {
      Sentry.captureException(error, { extra: { context: 'GET /api/cron/sign-month: publish', ym } })
      return Response.json({ error: 'Internal error' }, { status: 500 })
    }
    const notEmailed = rows.filter((r) => r.status === 'pending' && !r.emailed_at).length
    if (notEmailed > 0) {
      Sentry.captureMessage('Monthly sign text: pending texts were never emailed, NOT published (evergreen shows)', {
        level: 'warning',
        extra: { ym, notEmailed },
      })
    }
    return Response.json({ phase, month: ym, published: published?.length ?? 0, notEmailed, rejected: count('rejected') })
  }

  // ---- GENERATE ------------------------------------------------------------------------------
  const startedAt = Date.now()
  // Carry the openings and sentence-2 verbs of the texts already written forward, so no two signs repeat.
  const usedStarts = rows.filter((r) => r.status !== 'rejected').flatMap((r) => usedMarkers(String(r.content)))
  const generated: string[] = []
  const failed: { sign: string; reason: string }[] = []
  let outOfTime = 0
  for (const sign of missing) {
    if (Date.now() - startedAt > GENERATE_BUDGET_MS) {
      outOfTime += 1
      continue
    }
    try {
      const r = await generateSignMonthText(sign, ym, usedStarts, { model: SIGN_MONTH_MODEL })
      if (!r.ok) {
        failed.push({ sign, reason: r.reason })
        continue
      }
      // ignoreDuplicates: a concurrent run that got there first wins; never overwrite.
      const { error } = await supabase
        .from('sign_month_texts')
        .upsert(
          { sign, year_month: ym, content: r.content, model_version: r.model, status: 'pending' },
          { onConflict: 'sign,year_month', ignoreDuplicates: true },
        )
      if (error) failed.push({ sign, reason: `save: ${error.message}` })
      else {
        generated.push(sign)
        usedStarts.push(...usedMarkers(r.content))
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'GET /api/cron/sign-month: generate', sign, ym } })
      failed.push({ sign, reason: err instanceof Error ? err.message : 'unknown' })
    }
  }

  // ---- EMAIL THE FOUNDER ----------------------------------------------------------------------
  // Send once all 12 exist, or on the last generating day (the 26th) with whatever exists, the
  // missing signs being listed as evergreen. Never a second mail for the same set.
  const { data: pending, error: pendingError } = await supabase
    .from('sign_month_texts')
    .select('sign, content, emailed_at')
    .eq('year_month', ym)
    .eq('status', 'pending')
  let email: 'sent' | 'waiting' | 'already-sent' | 'failed' = 'waiting'
  if (pendingError) {
    Sentry.captureException(pendingError, { extra: { context: 'GET /api/cron/sign-month: read pending', ym } })
    email = 'failed'
  } else {
    const list = pending ?? []
    const unsent = list.filter((r) => !r.emailed_at)
    const allThere = list.length + count('rejected') >= SIGN_KEYS.length
    const lastDay = day >= 26 || requested !== null
    if (unsent.length === 0) email = list.length > 0 ? 'already-sent' : 'waiting'
    else if (allThere || lastDay) {
      const secret = process.env.SIGN_MONTH_VETO_SECRET?.trim()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
      if (!secret || !baseUrl) {
        Sentry.captureMessage('Monthly sign text: SIGN_MONTH_VETO_SECRET or NEXT_PUBLIC_APP_URL not set; no review email', {
          level: 'error',
          extra: { ym },
        })
        email = 'failed'
      } else {
        const present = new Set([...list.map((r) => r.sign as string), ...rows.map((r) => r.sign as string)])
        const evergreenSigns = SIGN_KEYS.filter((s) => !present.has(s)) as ZodiacSign[]
        const mail = buildReviewEmail({
          month: ym,
          rows: list.map((r) => ({ sign: r.sign as ZodiacSign, content: String(r.content) })),
          evergreenSigns,
          baseUrl,
          secret,
        })
        const sendError = await sendReviewEmail(mail)
        if (sendError) {
          Sentry.captureMessage(`Monthly sign text: review email NOT sent (${sendError}); the texts will not publish`, {
            level: 'error',
            extra: { ym },
          })
          email = 'failed'
        } else {
          const { error: stampError } = await supabase
            .from('sign_month_texts')
            .update({ emailed_at: new Date().toISOString() })
            .eq('year_month', ym)
            .eq('status', 'pending')
            .is('emailed_at', null)
          if (stampError) {
            Sentry.captureException(stampError, { extra: { context: 'GET /api/cron/sign-month: stamp emailed_at', ym } })
            email = 'failed'
          } else email = 'sent'
        }
      }
    }
  }

  if (failed.length > 0) {
    Sentry.captureMessage('Monthly sign text: some signs failed (they show their evergreen text)', {
      level: 'warning',
      extra: { ym, failed },
    })
  }
  return Response.json({ phase, month: ym, generated: generated.length, skipped: have.size, outOfTime, failed, email })
}
