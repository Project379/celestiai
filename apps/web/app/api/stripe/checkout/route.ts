import { currentUser } from '@clerk/nextjs/server'
import {
  requireAccountActive,
  requireAppUser,
  toErrorResponse,
} from '@/lib/auth/guards'
import { stripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  let priceId: string
  let startTrial = false
  try {
    const body = await req.json()
    priceId = body?.priceId
    startTrial = body?.startTrial === true
  } catch {
    return Response.json({ error: 'Невалидна заявка' }, { status: 400 })
  }

  const allowedPriceIds = new Set([
    process.env.STRIPE_PRICE_MONTHLY!,
    process.env.STRIPE_PRICE_ANNUAL!,
  ])

  if (!priceId || !allowedPriceIds.has(priceId)) {
    return Response.json({ error: 'Невалидна цена' }, { status: 400 })
  }

  try {
    const { userId, user } = await requireAppUser()
    requireAccountActive(user)

    if (startTrial && user.trial_claimed_at) {
      return Response.json(
        { error: 'Trial already claimed' },
        { status: 403 }
      )
    }

    if (startTrial && user.subscription_tier === 'premium') {
      return Response.json(
        { error: 'Premium access already active' },
        { status: 400 }
      )
    }

    const clerkUser = await currentUser()
    const customerEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? undefined
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    if (user.stripe_customer_id && customerEmail) {
      await stripe.customers.update(user.stripe_customer_id, {
        email: customerEmail,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: userId,
      ...(user.stripe_customer_id
        ? { customer: user.stripe_customer_id }
        : { customer_email: customerEmail }),
      metadata: {
        clerkUserId: userId,
        checkoutType: startTrial ? 'trial' : 'paid',
      },
      subscription_data: {
        ...(startTrial
          ? {
              trial_period_days: 7,
              trial_settings: {
                end_behavior: {
                  missing_payment_method: 'cancel' as const,
                },
              },
            }
          : {}),
        metadata: {
          clerkUserId: userId,
          checkoutType: startTrial ? 'trial' : 'paid',
        },
      },
      ...(startTrial ? { payment_method_collection: 'if_required' as const } : {}),
      success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?cancelled=true`,
      allow_promotion_codes: true,
    })

    return Response.json({ url: session.url })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при създаване на плащане')
  }
}
