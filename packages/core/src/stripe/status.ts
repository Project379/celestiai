import { createStripeClient } from '../lib/stripe'
import { createCoreSupabaseClient } from '../lib/supabase'

export interface StripeStatusResponse {
  tier: 'free' | 'premium'
}

/**
 * Core function: current user's subscription tier, with optional fast-path
 * activation from a Stripe Checkout session.
 *
 * Behavior identical to apps/web/app/api/stripe/status/route.ts as it
 * existed at commit d581012:
 *   - If sessionId is provided AND the Stripe session is paid AND its
 *     metadata.clerkUserId matches the caller, upsert the user to premium
 *     immediately (don't wait for the webhook).
 *   - Otherwise, return the DB subscription_tier value (default 'free' on
 *     missing user or DB error).
 *
 * Throws propagate to the caller; the route handler wrapper catches for
 * HTTP response shaping.
 */
export async function getStripeStatus(
  userId: string,
  sessionId: string | null,
): Promise<StripeStatusResponse> {
  const stripe = createStripeClient()
  const supabase = createCoreSupabaseClient()

  // Fast path: check Stripe checkout session directly + activate premium
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (
        session.payment_status === 'paid' &&
        session.metadata?.clerkUserId === userId
      ) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        )
        const item = subscription.items.data[0]
        const expiresAt = item
          ? new Date(item.current_period_end * 1000).toISOString()
          : null

        await supabase.from('users').upsert(
          {
            clerk_id: userId,
            subscription_tier: 'premium',
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            subscription_expires_at: expiresAt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'clerk_id' },
        )

        return { tier: 'premium' }
      }
    } catch (err) {
      console.error('[core/stripe/status] session check failed:', err)
      // Fall through to DB check
    }
  }

  // Fallback: DB tier lookup
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[core/stripe/status] DB fetch failed:', error.message)
    return { tier: 'free' }
  }

  if (!user) {
    return { tier: 'free' }
  }

  return {
    tier: user.subscription_tier === 'premium' ? 'premium' : 'free',
  }
}
