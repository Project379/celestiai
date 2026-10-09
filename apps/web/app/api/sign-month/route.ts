import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'

import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { SIGN_MONTH_EVERGREEN } from '@/lib/sign-month/evergreen'
import { isYearMonth, SIGN_KEYS } from '@/lib/sign-month/generate'
import { sofiaYearMonth } from '@/lib/sign-month/month'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sign-month?sign=libra&month=2026-10
 *
 * The monthly text for one zodiac sign (Днес swipe page 3). Read-only; it never generates (the
 * monthly cron does). This route is where the publish rules are enforced, so nothing else has to
 * be trusted:
 *   - only a row with status 'published' is ever served; 'pending' (the founder's veto window) and
 *     'rejected' never are;
 *   - a month after the current one (Europe/Sofia) is refused (404), so next month's pending texts
 *     cannot leak early;
 *   - when there is no published row (rejected, failed validation, not generated yet, or the table
 *     does not exist yet) the sign's approved evergreen text is served instead, so the page always
 *     has something true to show.
 * Same text for every user of the sign.
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({ key: `sign-month:${userId}`, limit: 30, windowMs: 60_000 })

    const url = new URL(request.url)
    const sign = url.searchParams.get('sign') ?? ''
    const month = url.searchParams.get('month') ?? ''
    if (!(SIGN_KEYS as string[]).includes(sign) || !isYearMonth(month)) {
      return Response.json({ error: 'Bad request' }, { status: 400 })
    }
    if (month > sofiaYearMonth(new Date())) return Response.json({ content: null }, { status: 404 })

    const supabase = createServiceSupabaseClient()
    const { data, error } = await supabase
      .from('sign_month_texts')
      .select('content')
      .eq('sign', sign)
      .eq('year_month', month)
      .eq('status', 'published')
      .maybeSingle()
    // The table (or its status column) does not exist until the migration is applied by hand.
    const unmigrated = error?.code === '42P01' || error?.code === 'PGRST205' || error?.code === '42703'
    if (error && !unmigrated) throw error

    const content = data?.content ? String(data.content) : SIGN_MONTH_EVERGREEN[sign as keyof typeof SIGN_MONTH_EVERGREEN]
    return Response.json(
      { content, source: data?.content ? 'generated' : 'evergreen' },
      { headers: { 'Cache-Control': 'private, max-age=3600' } },
    )
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[api/sign-month] error', error)
    Sentry.captureException(error, { extra: { context: 'GET /api/sign-month' } })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
