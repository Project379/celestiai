import * as Sentry from '@sentry/nextjs'

import { verifyCronSecret } from '@/lib/auth/cron-secret'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { generateSignMonthText, isYearMonth, SIGN_KEYS, startWords } from '@/lib/sign-month/generate'
import { sofiaYearMonth } from '@/lib/sign-month/month'

export const dynamic = 'force-dynamic'
// 12 sequential generations, each with up to 3 tries. Typical total is about 1-2 minutes.
export const maxDuration = 300

/**
 * GET /api/cron/sign-month
 *
 * Vercel cron (see vercel.json: the 1st-3rd of each month, so a failed run on the 1st
 * is retried on the 2nd and 3rd). Writes the monthly sign text for the current month
 * (Europe/Sofia), one row per zodiac sign, ONLY for signs that have none yet, saving
 * each row as it is generated so a timeout never loses finished work. Every user of a
 * sign reads the same row; nothing is generated per user.
 *
 * Query: `?month=YYYY-MM` overrides the month; `?probe=1` reports what is missing and
 * stops (the post-deploy smoke test uses it; it never calls the model).
 */
export async function GET(req: Request) {
  // Bearer-secret authenticity, same as the other crons; not rate-limited for that reason.
  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!verifyCronSecret(req.headers.get('Authorization'), cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const probe = url.searchParams.get('probe') === '1'
  const requested = url.searchParams.get('month')
  const ym = requested ?? sofiaYearMonth(new Date())
  if (!isYearMonth(ym)) return Response.json({ error: 'Bad month' }, { status: 400 })
  if (probe) Sentry.getCurrentScope().setTag('probe', 'smoke')

  const supabase = createServiceSupabaseClient()
  const { data: existing, error: readError } = await supabase
    .from('sign_month_texts')
    .select('sign, content')
    .eq('year_month', ym)
  // The table does not exist until the migration is applied by hand. For the post-deploy
  // smoke probe that is a WARNING, not a failure: it must not turn production red before
  // the founder applies supabase/migrations/20261009120000_sign_month_texts.sql.
  const tableMissing = readError?.code === '42P01' || readError?.code === 'PGRST205'
  if (readError && tableMissing && probe) {
    return Response.json({
      probe: true,
      skipped: true,
      warning:
        'sign_month_texts is missing: apply supabase/migrations/20261009120000_sign_month_texts.sql by hand (never db push), then supabase migration repair --status applied 20261009120000',
    })
  }
  if (readError) {
    Sentry.captureException(readError, { extra: { context: 'GET /api/cron/sign-month: read existing' } })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }

  const have = new Set((existing ?? []).map((r) => r.sign as string))
  const missing = SIGN_KEYS.filter((s) => !have.has(s))
  if (probe) return Response.json({ probe: true, month: ym, existing: have.size, missing: missing.length })

  // No two signs start with the same word this month: carry the used first words forward.
  const usedStarts = (existing ?? []).flatMap((r) => startWords(String(r.content)))
  const generated: string[] = []
  const failed: { sign: string; reason: string }[] = []
  for (const sign of missing) {
    try {
      const r = await generateSignMonthText(sign, ym, usedStarts)
      if (!r.ok) {
        failed.push({ sign, reason: r.reason })
        continue
      }
      // ignoreDuplicates: a concurrent run that got there first wins; never overwrite.
      const { error } = await supabase
        .from('sign_month_texts')
        .upsert(
          { sign, year_month: ym, content: r.content, model_version: r.model },
          { onConflict: 'sign,year_month', ignoreDuplicates: true },
        )
      if (error) failed.push({ sign, reason: `save: ${error.message}` })
      else {
        generated.push(sign)
        usedStarts.push(...startWords(r.content))
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'GET /api/cron/sign-month: generate', sign, ym } })
      failed.push({ sign, reason: err instanceof Error ? err.message : 'unknown' })
    }
  }

  if (failed.length > 0) {
    Sentry.captureMessage('Monthly sign text: some signs failed', {
      level: 'warning',
      extra: { ym, failed },
    })
  }
  return Response.json({ month: ym, generated: generated.length, skipped: have.size, failed })
}
