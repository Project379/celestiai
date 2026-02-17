import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/stripe/checkout
 * Creates a Stripe hosted Checkout session for a subscription upgrade.
 *
 * Auth: Required (Clerk)
 * Body: { priceId: string }
 * Returns: { url: string } — redirect user to this URL
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  let priceId: string
  try {
    const body = await req.json()
    priceId = body?.priceId
  } catch {
    return Response.json({ error: 'Невалидна заявка' }, { status: 400 })
  }

  // Validate priceId against allowlist — prevent arbitrary price IDs
  const allowedPriceIds = new Set([
    process.env.STRIPE_PRICE_MONTHLY!,
    process.env.STRIPE_PRICE_ANNUAL!,
  ])

  if (!priceId || !allowedPriceIds.has(priceId)) {
    return Response.json({ error: 'Невалидна цена' }, { status: 400 })
  }

  try {
    const supabase = createServiceSupabaseClient()

    // Look up the user's existing Stripe customer ID
    const { data: user } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: user?.stripe_customer_id ?? undefined,
      customer_creation: user?.stripe_customer_id ? undefined : 'always',
      metadata: {
        clerkUserId: userId,
      },
      subscription_data: {
        metadata: {
          clerkUserId: userId,
        },
      },
      success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?cancelled=true`,
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    console.error('[Stripe Checkout] Error creating session:', error)
    return Response.json({ error: 'Грешка при създаване на плащане' }, { status: 500 })
  }
}
