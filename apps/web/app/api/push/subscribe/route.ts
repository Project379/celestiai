import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/push/subscribe
 * Saves a browser push subscription to the database.
 * Upserts on endpoint conflict (re-subscribing browser updates the row).
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    // SECURITY FIX (2026-08-14, Batch 5.5 #20): no rate limiting at all,
    // unlike every other authenticated write route in this app.
    await assertRateLimit({
      key: `push-subscribe:${userId}`,
      limit: 20,
      windowMs: 60_000,
    })

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

    // SECURITY FIX (2026-08-14, Batch 5.5 #19): the upsert below had no
    // ownership guard — onConflict:'endpoint' means re-POSTing an
    // endpoint that already belongs to a DIFFERENT user's row would
    // silently reassign user_id to the caller, displacing the original
    // owner from ever receiving pushes on that subscription. Low
    // likelihood (a push endpoint isn't normally guessable/leaked), but
    // real if one ever were. Check-then-act, not a database constraint —
    // acceptable here since the consequence of losing the race is at
    // worst the same outcome the code had before this fix (silent
    // reassignment), not new exposure, and the payload this protects is
    // a generic reminder notification, not sensitive data.
    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .eq('endpoint', subscription.endpoint)
      .maybeSingle()

    if (existing && existing.user_id !== userId) {
      console.warn(
        '[Push Subscribe] Rejected: endpoint already owned by a different user',
        { endpoint: subscription.endpoint },
      )
      return Response.json(
        { error: 'Абонаментът вече принадлежи на друг акаунт.' },
        { status: 409 },
      )
    }

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
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Push Subscribe] Error:', error)
    return Response.json({ error: 'Грешка при абонирането' }, { status: 500 })
  }
}
