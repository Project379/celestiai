import { auth } from '@clerk/nextjs/server'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

const VALID_PLATFORMS = ['ios', 'android'] as const
type Platform = (typeof VALID_PLATFORMS)[number]

/**
 * POST /api/push/register
 * Registers (or re-registers) a mobile device's Expo push token.
 * Upserts on (user_id, device_id) — a re-grant or token rotation for the
 * same device updates the existing row and clears revoked_at, rather than
 * accumulating duplicate rows. Sibling to /api/push/subscribe (web-push);
 * this is the native/Expo-token transport (REVISIT-26 / P.16).
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
      key: `push-register:${userId}`,
      limit: 20,
      windowMs: 60_000,
    })

    const body = await req.json()
    const { token, platform, deviceId } = body as {
      token?: string
      platform?: string
      deviceId?: string
    }

    if (!token || typeof token !== 'string') {
      return Response.json({ error: 'Невалиден push токен' }, { status: 400 })
    }

    if (!platform || !VALID_PLATFORMS.includes(platform as Platform)) {
      return Response.json({ error: 'Невалидна платформа' }, { status: 400 })
    }

    if (!deviceId || typeof deviceId !== 'string') {
      return Response.json({ error: 'Липсва device_id' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    const { error } = await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        platform,
        device_id: deviceId,
        registered_at: new Date().toISOString(),
        revoked_at: null,
      },
      { onConflict: 'user_id,device_id' }
    )

    if (error) {
      console.error('[Push Register] Error:', error)
      return Response.json({ error: 'Грешка при регистрирането' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Push Register] Error:', error)
    return Response.json({ error: 'Грешка при регистрирането' }, { status: 500 })
  }
}
