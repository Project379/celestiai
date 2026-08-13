import webpush from 'web-push'
import { Expo } from 'expo-server-sdk'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

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

export async function GET(req: Request) {
  // Verify CRON_SECRET to prevent unauthorized execution
  //
  // Not rate-limited: request authenticity is enforced via this bearer-secret
  // check, a stronger control than a request-count limit here. If this
  // handler ever accepts requests without the CRON_SECRET check, it needs
  // rate limiting.
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Configure VAPID details for web-push authentication
  webpush.setVapidDetails(
    'mailto:hello@stellaeum.app',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )

  const supabase = createServiceSupabaseClient()

  // Fetch all active push subscriptions
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')

  if (error) {
    console.error('[Cron Daily Horoscope] Failed to fetch subscriptions:', error)
    return Response.json({ error: 'Грешка при зареждане на абонаментите' }, { status: 500 })
  }

  if (!subscriptions || subscriptions.length === 0) {
    return Response.json({ sent: 0, failed: 0 })
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

  // Send notification to each subscriber
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload
      )
      sent++
    } catch (err: unknown) {
      failed++

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
    }
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
    `[Cron Daily Horoscope] Completed: ${sent} sent, ${failed} failed, ${expiredEndpoints.length} expired cleaned up`
  )

  const mobile = await sendMobilePush(supabase)

  return Response.json({ sent, failed, mobile })
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
    await supabase
      .from('push_tokens')
      .update({ last_sent_at: new Date().toISOString() })
      .in(
        'token',
        sentTokens.map((t) => t.token)
      )
  }

  console.log(
    `[Cron Daily Horoscope] Mobile: ${sent} sent, ${failed} failed, ${revokedNow.length} revoked`
  )

  return { sent, failed, revoked: revokedNow.length }
}
