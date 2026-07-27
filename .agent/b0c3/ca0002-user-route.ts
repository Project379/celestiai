import { auth } from '@clerk/nextjs/server'
import { ensureUserRecord } from '@/lib/users/ensure-user'

/**
 * Protected API route example demonstrating SEC-17:
 * "API routes validate authentication before processing"
 *
 * auth.protect() returns 404 for unauthenticated requests,
 * preventing enumeration attacks while enforcing auth.
 */
export async function GET() {
  // Protect route - returns 404 if not authenticated
  await auth.protect()

  // Get user info after protection
  const { userId, sessionId } = await auth()
  const appUser = userId ? await ensureUserRecord(userId) : null

  return Response.json({
    userId,
    sessionId,
    appUser,
    timestamp: new Date().toISOString(),
  })
}
