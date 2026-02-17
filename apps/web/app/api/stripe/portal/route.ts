import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/stripe/portal
 * Creates a Stripe Customer Portal session.
 * Used for billing history, payment method management.
 *
 * Auth: Required (Clerk)
 * Returns: { url: string } — redirect user to this URL
 */
export async function POST() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const supabase = createServiceSupabaseClient()
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single()

    const stripeCustomerId = user?.stripe_customer_id
    if (!stripeCustomerId) {
      return Response.json({ error: 'Няма свързан акаунт за плащане' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings`,
    })

    return Response.json({ url: portalSession.url })
  } catch (error) {
    console.error('[Stripe Portal] Error creating portal session:', error)
    return Response.json({ error: 'Грешка при отваряне на портала за плащания' }, { status: 500 })
  }
}
