import { auth } from '@clerk/nextjs/server'
import { getSubscriptionOverview } from '@/lib/stripe/subscription-overview'

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
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const overview = await getSubscriptionOverview(userId)
  return Response.json(overview)
}
