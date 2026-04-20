import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * Fast-path activation on Stripe Checkout success.
 *
 * Called from /api/stripe/status when the /subscription/success page
 * polls with the returned session_id. Verifies the Checkout session is
 * paid and belongs to the caller, then upserts the user row to premium
 * immediately so the UI reflects the upgrade without waiting for the
 * asynchronous webhook.
 *
 * Returns true if the user was upserted to premium as a result of this
 * call; false on any failure or mismatch. Caller falls back to a normal
 * tier read in either case, so errors here are intentionally swallowed.
 */
export async function activatePremiumFromSession(
  userId: string,
  sessionId: string,
): Promise<boolean> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    if (
      session.payment_status !== 'paid' ||
      session.metadata?.clerkUserId !== userId
    ) {
      return false
    }

    const subscription = await stripe.subscriptions.retrieve(
      session.subscription as string,
    )
    const item = subscription.items.data[0]
    const expiresAt = item
      ? new Date(item.current_period_end * 1000).toISOString()
      : null

    const supabase = createServiceSupabaseClient()
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

    return true
  } catch (err) {
    console.error('[stripe/activate-from-session] failed:', err)
    return false
  }
}
