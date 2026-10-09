import * as Sentry from '@sentry/nextjs'

import { isYearMonth, SIGN_KEYS } from '@/lib/sign-month/generate'
import { verifyVetoToken } from '@/lib/sign-month/veto-token'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

/**
 * The founder's veto for one monthly sign text (linked from the review email).
 *
 *   GET  ?sign&month&t  shows the text and a confirm button. It changes NOTHING: mail scanners and
 *                       link previewers open every link in an email, so a GET must never act.
 *   POST ?sign&month&t  rejects the text (status 'rejected'); the app then serves that sign's
 *                       approved evergreen text. Works before and after the 1st.
 *
 * Authorised by the HMAC token alone (SIGN_MONTH_VETO_SECRET), not by a login: there is no admin
 * role in this app, and the token covers exactly this one action on this one text.
 * Operator-facing, English, no Bulgarian literals.
 */

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sign text review</title></head><body style="font-family:Georgia,serif;max-width:34rem;margin:3rem auto;padding:0 1rem;line-height:1.5">${body}</body></html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
    },
  )

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function parse(req: Request): { sign: string; month: string; t: string } | null {
  const u = new URL(req.url)
  const sign = u.searchParams.get('sign') ?? ''
  const month = u.searchParams.get('month') ?? ''
  const t = u.searchParams.get('t') ?? ''
  if (!(SIGN_KEYS as string[]).includes(sign) || !isYearMonth(month)) return null
  if (!verifyVetoToken(sign, month, t, process.env.SIGN_MONTH_VETO_SECRET)) return null
  return { sign, month, t }
}

export async function GET(req: Request) {
  const p = parse(req)
  if (!p) return page('<p>This link is not valid.</p>', 403)
  try {
    const { data, error } = await createServiceSupabaseClient()
      .from('sign_month_texts')
      .select('content, status')
      .eq('sign', p.sign)
      .eq('year_month', p.month)
      .maybeSingle()
    if (error) throw error
    if (!data) return page('<p>There is no text for this sign and month.</p>', 404)
    const text = esc(String(data.content))
    if (data.status === 'rejected') {
      return page(`<p>Already rejected. The evergreen text is shown instead.</p><blockquote>${text}</blockquote>`)
    }
    const u = new URL(req.url)
    return page(
      `<p>${esc(p.sign)} · ${esc(p.month)} (${esc(String(data.status))})</p><blockquote style="font-size:1.1rem">${text}</blockquote><form method="post" action="${esc(u.pathname + u.search)}"><button type="submit" style="font-size:1rem;padding:.6rem 1rem">Reject this text</button></form><p style="color:#555;font-size:.85rem">The sign's evergreen text is shown instead. Nothing happens until you press the button.</p>`,
    )
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'GET /api/sign-month/veto' } })
    return page('<p>Something went wrong. Try again.</p>', 500)
  }
}

export async function POST(req: Request) {
  const p = parse(req)
  if (!p) return page('<p>This link is not valid.</p>', 403)
  try {
    const { data, error } = await createServiceSupabaseClient()
      .from('sign_month_texts')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('sign', p.sign)
      .eq('year_month', p.month)
      .in('status', ['pending', 'published'])
      .select('sign')
    if (error) throw error
    if (!data || data.length === 0) {
      return page('<p>Nothing to reject: the text is missing or already rejected.</p>', 404)
    }
    return page(`<p>Rejected. ${esc(p.sign)} · ${esc(p.month)} will show its evergreen text.</p>`)
  } catch (err) {
    Sentry.captureException(err, { extra: { context: 'POST /api/sign-month/veto' } })
    return page('<p>Something went wrong. Try again.</p>', 500)
  }
}
