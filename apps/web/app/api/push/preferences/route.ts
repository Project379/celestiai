import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { assertRateLimit } from '@/lib/rate-limit'

const schema = z.object({ category: z.enum(['morning', 'diary']), enabled: z.boolean() })

export async function GET() {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  const supabase = createServiceSupabaseClient()
  const [web, mobile] = await Promise.all([
    supabase.from('push_subscriptions').select('morning_enabled,diary_enabled').eq('user_id', userId),
    supabase.from('push_tokens').select('morning_enabled,diary_enabled').eq('user_id', userId).is('revoked_at', null),
  ])
  if (web.error || mobile.error) return Response.json({ error: 'Не успяхме да заредим известията.' }, { status: 500 })
  const rows = [...(web.data ?? []), ...(mobile.data ?? [])]
  return Response.json({
    morning: rows.some((row) => row.morning_enabled),
    diary: rows.some((row) => row.diary_enabled),
  })
}

export async function PATCH(request: Request) {
  const { userId } = await auth()
  if (!userId) return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: 'Невалидни настройки' }, { status: 400 })
  await assertRateLimit({ key: `push-preferences:${userId}`, limit: 20, windowMs: 60_000 })
  const column = parsed.data.category === 'diary' ? 'diary_enabled' : 'morning_enabled'
  const supabase = createServiceSupabaseClient()
  const [web, mobile] = await Promise.all([
    supabase.from('push_subscriptions').update({ [column]: parsed.data.enabled }).eq('user_id', userId).select('id'),
    supabase.from('push_tokens').update({ [column]: parsed.data.enabled }).eq('user_id', userId).is('revoked_at', null).select('id'),
  ])
  if (web.error || mobile.error) return Response.json({ error: 'Не успяхме да запазим известията.' }, { status: 500 })
  return Response.json({ success: true, deliveryTargets: (web.data?.length ?? 0) + (mobile.data?.length ?? 0) })
}
