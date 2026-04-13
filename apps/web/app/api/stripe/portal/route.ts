import { requireAppUser, toErrorResponse } from '@/lib/auth/guards'
import { stripe } from '@/lib/stripe/client'

export async function POST() {
  try {
    const { user } = await requireAppUser()

    const stripeCustomerId = user.stripe_customer_id
    if (!stripeCustomerId) {
      return Response.json(
        { error: 'Няма свързан акаунт за плащане' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/settings`,
    })

    return Response.json({ url: portalSession.url })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при отваряне на портала за плащания')
  }
}
