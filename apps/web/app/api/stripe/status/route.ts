import { auth } from '@clerk/nextjs/server'
import { activatePremiumFromSession } from '@/lib/stripe/activate-from-session'
import { ensureUserRecord } from '@/lib/users/ensure-user'

/**
 * GET /api/stripe/status?session_id=cs_xxx
 *
 * Used by the /subscription/success page to poll until premium is active.
 * If a Checkout session_id is supplied we attempt a fast-path activation
 * against Stripe (web-only concern — mobile IAP goes through RevenueCat),
 * then return the canonical tier from the DB either way.
 *
 * Activate failure (defensive) falls through to a fresh DB read — the
 * webhook will catch up regardless. Tier-read failure returns 'free' so
 * the success page never sees a 500.
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  if (sessionId) {
    try {
      await activatePremiumFromSession(userId, sessionId)
    } catch (err) {
      console.error('[api/stripe/status] activate failed, falling through:', err)
    }
  }

  try {
    const appUser = await ensureUserRecord(userId)
    return Response.json({ tier: appUser.subscription_tier })
  } catch (err) {
    console.error('[api/stripe/status] tier read failed:', err)
    return Response.json({ tier: 'free' })
  }
}
