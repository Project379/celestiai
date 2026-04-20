import { auth } from '@clerk/nextjs/server'
import { getSubscriptionTier } from '@celestia/core/subscription/tier'
import { activatePremiumFromSession } from '@/lib/stripe/activate-from-session'

/**
 * GET /api/stripe/status?session_id=cs_xxx
 *
 * Used by the /subscription/success page to poll until premium is active.
 * If a Checkout session_id is supplied we attempt a fast-path activation
 * against Stripe (web-only concern — mobile IAP goes through RevenueCat),
 * then return the canonical tier from the DB either way.
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  try {
    if (sessionId) {
      await activatePremiumFromSession(userId, sessionId)
    }
    const tier = await getSubscriptionTier(userId)
    return Response.json({ tier })
  } catch (err) {
    console.error('[api/stripe/status] error:', err)
    return Response.json({ tier: 'free' })
  }
}
