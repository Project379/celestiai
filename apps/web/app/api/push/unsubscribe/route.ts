import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/push/unsubscribe
 * Removes a browser push subscription from the database.
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
      key: `push-unsubscribe:${userId}`,
      limit: 20,
      windowMs: 60_000,
    })

    const body = await req.json()
    const { endpoint } = body as { endpoint?: string }

    if (!endpoint || typeof endpoint !== 'string') {
      return Response.json({ error: 'Невалиден endpoint' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', userId)

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Push Unsubscribe] Error:', error)
    return Response.json({ error: 'Грешка при отписването' }, { status: 500 })
  }
}
