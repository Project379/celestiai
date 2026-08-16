import { auth } from '@clerk/nextjs/server'
import { ensureUserRecord } from '@/lib/users/ensure-user'
import { assertRateLimit } from '@/lib/rate-limit'
import { ApiError } from '@/lib/auth/guards'

/**
 * GET /api/user
 *
 * Returns the caller's Clerk userId + sessionId + canonical app-user row.
 * Auth: explicit auth() + BG 401. auth.protect() is deliberately not used
 * inside route handlers — it throws on missing session, which surfaces as
 * an opaque 500 from the route layer rather than the structured { error }
 * JSON the rest of the protected API returns.
 */
export async function GET() {
  const { userId, sessionId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    // Rate-limit before ensureUserRecord's DB upsert/read — same ordering
    // lesson Batch 3 fixed elsewhere (gdpr/delete-account, stripe/checkout):
    // the burst guard has to gate the expensive work, not run after it.
    await assertRateLimit({ key: `user-get:${userId}`, limit: 60, windowMs: 60_000 })

    const appUser = await ensureUserRecord(userId)

    return Response.json({
      userId,
      sessionId,
      appUser,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }
}
