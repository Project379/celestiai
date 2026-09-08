import { auth } from '@clerk/nextjs/server'
import * as Sentry from '@sentry/nextjs'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { ApiError, readJsonBody, toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/push/unregister
 * Revokes a mobile device's Expo push token — sets revoked_at so the
 * daily-horoscope delivery cron (which selects `revoked_at IS NULL`) stops
 * targeting it. The native counterpart to /api/push/subscribe's sibling
 * /api/push/unsubscribe on the web-push transport.
 *
 * Added 2026-09-09 (PUSH-ORPHAN): mobile had a register route but no way
 * back off. Without this, a "notifications off" toggle in the app is a
 * lie — the row stays active and the cron keeps sending until Expo
 * happens to return DeviceNotRegistered.
 *
 * Body: { deviceId } — the same value mobile passed to /api/push/register
 * (currently the Expo token itself, per the push_tokens migration note).
 * Idempotent: revoking an already-revoked or absent row is a success.
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `push-unregister:${userId}`,
      limit: 20,
      windowMs: 60_000,
    })

    const body = await readJsonBody(req)
    const { deviceId } = body as { deviceId?: string }

    if (!deviceId || typeof deviceId !== 'string') {
      return Response.json({ error: 'Липсва device_id' }, { status: 400 })
    }

    const supabase = createServiceSupabaseClient()

    const { error } = await supabase
      .from('push_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .is('revoked_at', null)

    if (error) {
      console.error('[Push Unregister] Error:', error)
      // CAUGHT-500S (historical) — see .planning/PLACEHOLDERS.md.
      Sentry.captureException(error, { extra: { context: 'POST /api/push/unregister: update' } })
      return Response.json({ error: 'Грешка при изключването' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[Push Unregister] Error:', error)
    // CAUGHT-500S (historical) — see .planning/PLACEHOLDERS.md.
    return toErrorResponse(error, 'Грешка при изключването')
  }
}
