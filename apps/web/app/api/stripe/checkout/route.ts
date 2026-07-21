import { stripe } from '@/lib/stripe/client'
import { requireAppUser, requireAccountActive, toErrorResponse } from '@/lib/auth/guards'

/**
 * POST /api/stripe/checkout
 * Creates a Stripe hosted Checkout session for a subscription upgrade.
 *
 * Auth: Required (Clerk)
 * Body: { priceId: string }
 * Returns: { url: string } - redirect user to this URL
 *
 * Narrow requireAccountActive guard (B.0h-1): a user with a pending
 * account deletion cannot start a new subscription purchase — buying
 * premium days before the 30-day grace period hard-deletes the account
 * is a refund incident waiting to happen.
 */
export async function POST(req: Request) {
  let userId: string
  let stripeCustomerId: string | null
  try {
    const { userId: id, user } = await requireAppUser()
    requireAccountActive(user)
    userId = id
    stripeCustomerId = user.stripe_customer_id
  } catch (error) {
    return toErrorResponse(error, 'Неоторизиран достъп')
  }

  let priceId: string
  try {
    const body = await req.json()
    priceId = body?.priceId
  } catch {
    return Response.json({ error: 'Невалидна заявка' }, { status: 400 })
  }

  // Validate priceId against allowlist - prevent arbitrary price IDs
  const allowedPriceIds = new Set([
    process.env.STRIPE_PRICE_MONTHLY!,
    process.env.STRIPE_PRICE_ANNUAL!,
  ])

  if (!priceId || !allowedPriceIds.has(priceId)) {
    return Response.json({ error: 'Невалидна цена' }, { status: 400 })
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: stripeCustomerId ?? undefined,
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
