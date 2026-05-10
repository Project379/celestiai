import { auth } from '@clerk/nextjs/server'
import { ensureUserRecord } from '@/lib/users/ensure-user'

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
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const appUser = await ensureUserRecord(userId)

  return Response.json({
    userId,
    sessionId,
    appUser,
    timestamp: new Date().toISOString(),
  })
}
