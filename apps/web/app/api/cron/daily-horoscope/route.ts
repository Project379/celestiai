import webpush from 'web-push'
import { Expo } from 'expo-server-sdk'
import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { verifyCronSecret } from '@/lib/auth/cron-secret'

/**
 * GET /api/cron/daily-horoscope
 * Sends a generic morning push notification to all subscribers — both web
 * (Web Push / VAPID, `push_subscriptions`) and mobile (Expo push,
 * `push_tokens`, P.16 / REVISIT-26). Scheduled at 06:00 UTC daily via Vercel
 * cron. Same blanket, non-personalized delivery pattern on both transports —
 * per-user pattern-time scheduling is unbuilt future scope, not this cron.
 *
 * NOTE: The notification body is intentionally generic - not a personalized preview.
 * Personalized horoscope content is generated when the user visits /dashboard.
 * This avoids N concurrent AI calls at cron execution time.
 */
export const maxDuration = 300 // 5 minutes for batch processing

// Same Bulgarian copy as the web Web Push payload below — deliberately not a
// new string.
const MOBILE_TITLE = 'Твоят дневен хороскоп'
const MOBILE_BODY = 'Новото ти послание от звездите те очаква.'

// 2026-08-26 sweep finding #11, defensive ceiling + throughput fix — NOT
// full pagination (same "ceiling now, real redesign later" posture as
// finding #10's diary cap). The two problems this addresses:
//   1. Unbounded select — neither push_subscriptions nor push_tokens had
//      a .limit() anywhere; this caps each query explicitly rather than
//      relying on PostgREST's incidental 1000-row default.
//   2. Fully sequential sending — the web-push loop below awaited one
//      send at a time. At realistic ~200ms/send that put a hard ceiling
//      around 1,500 subscribers before maxDuration killed the function
//      mid-loop, with no cursor, so the same prefix was served every day
//      and the tail never got a push. Batched concurrency (below) is a
//      real throughput fix, not a ceiling — it doesn't just raise the
//      number, it changes the shape of the bottleneck from "network
//      latency x subscriber count" to "network latency x batches".
//      Mobile's Expo path already batches via expo.chunkPushNotifications
//      and was not resequenced.
const WEB_PUSH_SELECT_CEILING = 5000
const PUSH_TOKENS_SELECT_CEILING = 5000
// Concurrent web-push sends per batch. web-push has no built-in batching
// API (unlike Expo's SDK), so this is a manual concurrency limit — high
// enough to meaningfully cut wall-clock time, conservative enough not to
// look like a burst attack to any single push service's rate limiting.
const WEB_PUSH_CONCURRENCY = 25

export async function GET(req: Request) {
  // Verify CRON_SECRET to prevent unauthorized execution
  //
  // Not rate-limited: request authenticity is enforced via this bearer-secret
  // check, a stronger control than a request-count limit here. If this
  // handler ever accepts requests without the CRON_SECRET check, it needs
  // rate limiting.
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  // Timing-safe comparison (Batch 5.5 #22) — plain !== permits a timing
  // side-channel, low real-world exploitability but a cheap fix.
  if (!verifyCronSecret(authHeader, cronSecret)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceSupabaseClient()

  // Web Push and Expo (mobile) are independent transports with independent
  // failure modes. Run BOTH unconditionally and report each separately.
  // 2026-08-28: before this, the web block ran inline in this handler,
  // ahead of the mobile call — so a malformed VAPID_PRIVATE_KEY throwing
  // inside setVapidDetails (Sentry, release f3e2feb), a Supabase fetch
  // error, or even an early `return` on zero web subscribers all killed
  // the mobile push silently. A config error in one transport must
  // degrade only that transport, not the whole scheduled job.
  const web = await sendWebPush(supabase)
  const mobile = await sendMobilePush(supabase)

  return Response.json({ web, mobile })
}

/**
 * Sends the daily-horoscope Web Push (VAPID) notification to every row in
 * push_subscriptions. Mirrors sendMobilePush: wraps everything in its own
 * try/catch, never throws, and returns a { sent, failed, expired } tally
 * (plus { error } when the whole transport failed to start). Isolating it
 * this way is the point — see the handler comment.
 */
async function sendWebPush(
  supabase: ReturnType<typeof createServiceSupabaseClient>
): Promise<{ sent: number; failed: number; expired: number; error?: string }> {
  try {
    // Configure VAPID details for web-push authentication. Throws
    // synchronously if NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are
    // absent or malformed — e.g. a private key that doesn't base64url-decode
    // to exactly 32 bytes ("Vapid private key should be 32 bytes long when
    // decoded"). Caught below; reported as { error }; mobile push unaffected.
    webpush.setVapidDetails(
      'mailto:hello@stellaeum.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )

    // Fetch all active push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .limit(WEB_PUSH_SELECT_CEILING)

    if (error) {
      console.error('[Cron Daily Horoscope] Failed to fetch subscriptions:', error)
      return { sent: 0, failed: 0, expired: 0, error: 'subscription fetch failed' }
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0, expired: 0 }
    }

    const payload = JSON.stringify({
      title: 'Твоят дневен хороскоп',
      body: 'Новото ти послание от звездите те очаква.',
      icon: '/icon-192x192.png',
      url: '/dashboard',
    })

    let sent = 0
    let failed = 0
    const expiredEndpoints: string[] = []

    // Send notification to each subscriber, WEB_PUSH_CONCURRENCY at a time
    // rather than one at a time — see the constant's doc comment above.
    // Per-subscriber error handling (expired-endpoint detection) is
    // unchanged; only the await structure changed, from one-at-a-time to
    // batched-parallel.
    for (let i = 0; i < subscriptions.length; i += WEB_PUSH_CONCURRENCY) {
      const batch = subscriptions.slice(i, i + WEB_PUSH_CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map((sub) =>
          webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payload
          )
        )
      )

      results.forEach((result, idx) => {
        const sub = batch[idx]
        if (result.status === 'fulfilled') {
          sent++
          return
        }

        failed++
        const err = result.reason as unknown

        // Clean up expired or invalid subscriptions (410 Gone, 404 Not Found)
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? (err as { statusCode: number }).statusCode
            : null

        if (statusCode === 410 || statusCode === 404) {
          expiredEndpoints.push(sub.endpoint)
        } else {
          console.error(
            `[Cron Daily Horoscope] Failed to send to ${sub.endpoint}:`,
            err
          )
        }
      })
    }

    // Delete expired subscriptions in batch
    if (expiredEndpoints.length > 0) {
      const { error: deleteError } = await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints)

      if (deleteError) {
        console.error(
          '[Cron Daily Horoscope] Failed to clean up expired subscriptions:',
          deleteError
        )
      }
    }

    console.log(
      `[Cron Daily Horoscope] Web: ${sent} sent, ${failed} failed, ${expiredEndpoints.length} expired cleaned up`
    )

    return { sent, failed, expired: expiredEndpoints.length }
  } catch (err) {
    // Transport-level failure (almost always setVapidDetails rejecting a
    // bad env key). Catching it here keeps the daily job alive, but a
    // returned Response means Next's onRequestError never fires — so
    // capture explicitly, or this regression goes silent again (same
    // reasoning as toErrorResponse's Sentry.captureException).
    console.error('[Cron Daily Horoscope] Web push transport failed:', err)
    Sentry.captureException(err, {
      tags: { cron: 'daily-horoscope', transport: 'web-push' },
    })
    return {
      sent: 0,
      failed: 0,
      expired: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/**
 * Sends the same daily-horoscope notification to registered Expo push
 * tokens (mobile). Separate function/table/transport from the web-push
 * block above — kept side by side rather than unified since the two
 * SDKs, payload shapes, and failure semantics don't share code cleanly.
 */
async function sendMobilePush(
  supabase: ReturnType<typeof createServiceSupabaseClient>
): Promise<{ sent: number; failed: number; revoked: number }> {
  const { data: tokenRows, error } = await supabase
    .from('push_tokens')
    .select('token')
    .is('revoked_at', null)
    .limit(PUSH_TOKENS_SELECT_CEILING)

  if (error) {
    console.error('[Cron Daily Horoscope] Failed to fetch push_tokens:', error)
    return { sent: 0, failed: 0, revoked: 0 }
  }

  if (!tokenRows || tokenRows.length === 0) {
    return { sent: 0, failed: 0, revoked: 0 }
  }

  const expo = new Expo()

  const validTokens = tokenRows
    .map((row: { token: string }) => row.token)
    .filter((token: string) => {
      if (Expo.isExpoPushToken(token)) return true
      console.error(`[Cron Daily Horoscope] Skipping malformed Expo token: ${token}`)
      return false
    })

  if (validTokens.length === 0) {
    return { sent: 0, failed: 0, revoked: 0 }
  }

  const messages = validTokens.map((token: string) => ({
    to: token,
    sound: 'default' as const,
    title: MOBILE_TITLE,
    body: MOBILE_BODY,
    data: { url: '/' },
  }))

  const chunks = expo.chunkPushNotifications(messages)
  const tickets: { token: string; id?: string; deviceNotRegistered: boolean }[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    const chunkTokens = validTokens.slice(
      chunks.slice(0, i).reduce((n, c) => n + c.length, 0),
      chunks.slice(0, i).reduce((n, c) => n + c.length, 0) + chunk.length
    )

    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk)
      ticketChunk.forEach((ticket, idx) => {
        const token = chunkTokens[idx]
        if (ticket.status === 'error') {
          console.error(
            `[Cron Daily Horoscope] Ticket error for ${token}:`,
            ticket.message
          )
          tickets.push({
            token,
            deviceNotRegistered: ticket.details?.error === 'DeviceNotRegistered',
          })
        } else {
          tickets.push({ token, id: ticket.id, deviceNotRegistered: false })
        }
      })
    } catch (err) {
      console.error('[Cron Daily Horoscope] Failed to send Expo push chunk:', err)
    }
  }

  let sent = tickets.filter((t) => t.id).length
  let failed = tickets.length - sent
  const revokedNow = tickets.filter((t) => t.deviceNotRegistered).map((t) => t.token)

  // Receipts aren't available instantly — Expo recommends checking a short
  // while after sending. A 10s wait keeps this inside the cron's 300s
  // budget while giving DeviceNotRegistered receipts a real chance to
  // materialize before this run ends (soft-launch volume, single chunk).
  const receiptCandidates = tickets.filter((t) => t.id)
  if (receiptCandidates.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 10_000))

    const receiptIdChunks = expo.chunkPushNotificationReceiptIds(
      receiptCandidates.map((t) => t.id!)
    )

    for (const receiptIdChunk of receiptIdChunks) {
      try {
        const receipts = await expo.getPushNotificationReceiptsAsync(receiptIdChunk)
        for (const [receiptId, receipt] of Object.entries(receipts)) {
          if (receipt.status === 'error') {
            const candidate = receiptCandidates.find((t) => t.id === receiptId)
            console.error(
              `[Cron Daily Horoscope] Receipt error for ${candidate?.token}:`,
              receipt.message
            )
            if (candidate && receipt.details?.error === 'DeviceNotRegistered') {
              revokedNow.push(candidate.token)
              sent--
              failed++
            }
          }
        }
      } catch (err) {
        console.error(
          '[Cron Daily Horoscope] Failed to fetch Expo push receipts:',
          err
        )
      }
    }
  }

  if (revokedNow.length > 0) {
    const { error: revokeError } = await supabase
      .from('push_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .in('token', revokedNow)

    if (revokeError) {
      console.error(
        '[Cron Daily Horoscope] Failed to revoke dead push_tokens:',
        revokeError
      )
    }
  }

  const sentTokens = tickets.filter((t) => t.id && !revokedNow.includes(t.token))
  if (sentTokens.length > 0) {
    const { error: lastSentError } = await supabase
      .from('push_tokens')
      .update({ last_sent_at: new Date().toISOString() })
      .in(
        'token',
        sentTokens.map((t) => t.token)
      )
    if (lastSentError) {
      // Tracking-only column, gets overwritten next successful send — log
      // for parity with the two checked updates above, not a functional
      // concern.
      console.error(
        '[Cron Daily Horoscope] Failed to update last_sent_at on push_tokens:',
        lastSentError
      )
    }
  }

  console.log(
    `[Cron Daily Horoscope] Mobile: ${sent} sent, ${failed} failed, ${revokedNow.length} revoked`
  )

  return { sent, failed, revoked: revokedNow.length }
}
