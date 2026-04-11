import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * GET /api/stripe/status?session_id=cs_xxx
 *
 * Returns the authenticated user's current subscription tier.
 * Used by the /subscription/success page to poll until premium is active.
 *
 * If session_id is provided, checks Stripe directly for payment status
 * and activates premium immediately — no need to wait for the webhook.
 *
 * Auth: Required (Clerk)
 * Returns: { tier: string }
 */
export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('session_id')

  // Fast path: check Stripe checkout session directly
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId)

      if (
        session.payment_status === 'paid' &&
        session.metadata?.clerkUserId === userId
      ) {
        // Activate premium immediately — don't wait for webhook
        const supabase = createServiceSupabaseClient()
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
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
          { onConflict: 'clerk_id' }
        )

        return Response.json({ tier: 'premium' })
      }
    } catch (err) {
      console.error('[Stripe Status] Session check failed:', err)
      // Fall through to DB check
    }
  }

  // Fallback: check DB
  const supabase = createServiceSupabaseClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('subscription_tier')
    .eq('clerk_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[Stripe Status] Failed to fetch user tier:', error.message)
    return Response.json({ tier: 'free' })
  }

  if (!user) {
    return Response.json({ tier: 'free' })
  }

  return Response.json({ tier: user.subscription_tier })
}
