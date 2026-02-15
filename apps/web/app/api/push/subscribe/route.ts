import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/push/subscribe
 * Saves a browser push subscription to the database.
 * Upserts on endpoint conflict (re-subscribing browser updates the row).
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const subscription = body?.subscription as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }

    if (
      !subscription?.endpoint ||
      !subscription?.keys?.p256dh ||
      !subscription?.keys?.auth
    ) {
      return Response.json({ error: 'Невалидна абонаментна информация' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      { onConflict: 'endpoint' }
    )

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Push Subscribe] Error:', error)
    return Response.json({ error: 'Грешка при абонирането' }, { status: 500 })
  }
}
