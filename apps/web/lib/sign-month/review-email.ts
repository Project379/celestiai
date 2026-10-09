/**
 * The founder's monthly review email: the 12 texts of the coming month, each with a one-click
 * veto link. Sent over Resend's HTTP API with plain fetch (no email provider existed in the app
 * before this; the only "mail" was the VAPID mailto: contact). Needs RESEND_API_KEY and a
 * verified sending domain in SIGN_MONTH_REVIEW_FROM. The email itself is operator-facing and kept
 * in English; the texts are shown as stored.
 */
import { ZODIAC_SIGNS_BG, type ZodiacSign } from '@stellaeum/astrology/client'

import { signVetoToken } from './veto-token'

export const DEFAULT_REVIEW_TO = 'stella3um@gmail.com'

export interface ReviewRow {
  sign: ZodiacSign
  content: string
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function vetoUrl(baseUrl: string, sign: string, month: string, secret: string): string {
  const q = new URLSearchParams({ sign, month, t: signVetoToken(sign, month, secret) })
  return `${baseUrl.replace(/\/$/, '')}/api/sign-month/veto?${q.toString()}`
}

export function buildReviewEmail(opts: {
  month: string
  rows: ReviewRow[]
  /** Signs that have no generated text and will show their evergreen text. */
  evergreenSigns: ZodiacSign[]
  baseUrl: string
  secret: string
}): { subject: string; html: string; text: string } {
  const { month, rows, evergreenSigns, baseUrl, secret } = opts
  const subject = `Stellaeum: sign texts for ${month}. Reject any before the 1st; otherwise they publish.`
  const intro = `These ${rows.length} monthly sign texts go live on the 1st of ${month} unless you reject them first. A rejected text is replaced by that sign's evergreen text. Doing nothing publishes them all.`

  const htmlRows = rows
    .map((r) => {
      const link = vetoUrl(baseUrl, r.sign, month, secret)
      return `<tr><td style="padding:10px 12px;vertical-align:top;white-space:nowrap"><b>${esc(ZODIAC_SIGNS_BG[r.sign])}</b></td><td style="padding:10px 12px;vertical-align:top">${esc(r.content)}</td><td style="padding:10px 12px;vertical-align:top;white-space:nowrap"><a href="${esc(link)}">Reject…</a></td></tr>`
    })
    .join('')
  const evergreenNames = evergreenSigns.map((s) => ZODIAC_SIGNS_BG[s]).join(', ')
  const evergreenNote =
    evergreenSigns.length > 0 ? `<p>No generated text (the evergreen text will show): ${esc(evergreenNames)}.</p>` : ''
  const html = `<div style="font-family:Georgia,serif;font-size:16px;line-height:1.5;color:#111"><p>${esc(intro)}</p><table style="border-collapse:collapse">${htmlRows}</table>${evergreenNote}<p style="color:#555;font-size:13px">The Reject link opens a confirmation page; nothing changes until you press the button there.</p></div>`

  const text = [
    intro,
    '',
    ...rows.map((r) => `${ZODIAC_SIGNS_BG[r.sign]}: ${r.content}\n  Reject: ${vetoUrl(baseUrl, r.sign, month, secret)}`),
    ...(evergreenSigns.length > 0 ? ['', `No generated text (evergreen shows): ${evergreenNames}`] : []),
  ].join('\n')
  return { subject, html, text }
}

/** Sends the email. Returns an error string, or null when Resend accepted it. Never throws. */
export async function sendReviewEmail(mail: { subject: string; html: string; text: string }): Promise<string | null> {
  const key = process.env.RESEND_API_KEY?.trim()
  const from = process.env.SIGN_MONTH_REVIEW_FROM?.trim()
  const to = process.env.SIGN_MONTH_REVIEW_TO?.trim() || DEFAULT_REVIEW_TO
  if (!key || !from) return 'RESEND_API_KEY or SIGN_MONTH_REVIEW_FROM is not set'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return `Resend answered ${res.status}`
    return null
  } catch (err) {
    return err instanceof Error ? err.message : 'send failed'
  }
}
