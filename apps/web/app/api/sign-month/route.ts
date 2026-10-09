import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'

import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'
import { isYearMonth, SIGN_KEYS } from '@/lib/sign-month/generate'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/sign-month?sign=libra&month=2026-10
 *
 * The monthly text for one zodiac sign (Днес swipe page 3). Read-only; it never
 * generates (the monthly cron does). 404 when that sign and month has no text yet,
 * and the app then leaves the page out of the swipe. Same row for every user of the sign.
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

    const supabase = createServiceSupabaseClient()
    const { data, error } = await supabase
      .from('sign_month_texts')
      .select('content')
      .eq('sign', sign)
      .eq('year_month', month)
      .maybeSingle()
    if (error) throw error
    if (!data) return Response.json({ content: null }, { status: 404 })

    return Response.json({ content: data.content }, { headers: { 'Cache-Control': 'private, max-age=3600' } })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[api/sign-month] error', error)
    Sentry.captureException(error, { extra: { context: 'GET /api/sign-month' } })
    return Response.json({ error: 'Internal error' }, { status: 500 })
  }
}
