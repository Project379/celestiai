import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/push/unsubscribe
 * Removes a browser push subscription from the database.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
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
    console.error('[Push Unsubscribe] Error:', error)
    return Response.json({ error: 'Грешка при отписването' }, { status: 500 })
  }
}
