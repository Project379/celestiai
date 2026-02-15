import webpush from 'web-push'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/cron/daily-horoscope
 * Sends a generic morning push notification to all subscribers.
 * Scheduled at 06:00 UTC daily via Vercel cron.
 *
 * NOTE: The notification body is intentionally generic — not a personalized preview.
 * Personalized horoscope content is generated when the user visits /dashboard.
 * This avoids N concurrent AI calls at cron execution time.
 */
export const maxDuration = 300 // 5 minutes for batch processing

export async function GET(req: Request) {
  // Verify CRON_SECRET to prevent unauthorized execution
  const authHeader = req.headers.get('Authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  // Configure VAPID details for web-push authentication
  webpush.setVapidDetails(
    'mailto:hello@celestia.app',
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
    title: 'Вашият дневен хороскоп',
    body: 'Новото ви послание от звездите ви очаква.',
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

  return Response.json({ sent, failed })
}
