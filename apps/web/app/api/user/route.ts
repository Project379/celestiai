import { auth } from '@clerk/nextjs/server'

/**
 * GET /api/user
 *
 * Returns the caller's Clerk userId + sessionId. Auth: explicit auth()
 * + BG 401. auth.protect() is deliberately not used inside route
 * handlers — it throws on missing session, which surfaces as an opaque
 * 500 from the route layer rather than the structured { error } JSON
 * the rest of the protected API returns.
 */
export async function GET() {
  const { userId, sessionId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  return Response.json({
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
  })
}
