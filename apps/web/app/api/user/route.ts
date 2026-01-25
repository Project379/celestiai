import { auth } from '@clerk/nextjs/server'

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

  return Response.json({
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
  })
}
