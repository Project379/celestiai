import { auth } from '@clerk/nextjs/server'
import { getSubscriptionOverview } from '@/lib/stripe/subscription-overview'
import { ApiError } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * GET /api/stripe/subscription
 *
 * Auth: explicit auth() + BG 401. auth.protect() is deliberately not
 * used inside route handlers — it throws on missing session, which
 * surfaces as an opaque 500 from the route layer rather than the
 * structured { error } JSON the rest of the protected API returns.
 */
export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `stripe-subscription:${userId}`,
      limit: 30,
      windowMs: 60_000,
    })
  } catch (error) {
    if (error instanceof ApiError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status })
    }
    throw error
  }

  const overview = await getSubscriptionOverview(userId)
  return Response.json(overview)
}
