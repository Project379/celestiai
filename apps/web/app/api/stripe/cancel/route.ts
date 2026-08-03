import { logAuditEvent } from '@/lib/audit'
import { requireAppUser, toErrorResponse } from '@/lib/auth/guards'
import { stripe } from '@/lib/stripe/client'

export async function POST(req: Request) {
  let reason: string | undefined
  try {
    const body = await req.json()
    reason = body?.reason
  } catch {
    // Body is optional.
  }

  try {
    const { userId, user } = await requireAppUser()
    const subscriptionId = user.stripe_subscription_id

    if (!subscriptionId) {
      return Response.json({ error: 'Няма активен абонамент' }, { status: 400 })
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    logAuditEvent(userId, 'payment.subscription_cancelled', { reason })

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при отказ от абонамент')
  }
}

export async function DELETE() {
  try {
    const { userId, user } = await requireAppUser()
    const subscriptionId = user.stripe_subscription_id

    if (!subscriptionId) {
      return Response.json({ error: 'Няма активен абонамент' }, { status: 400 })
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    logAuditEvent(userId, 'payment.subscription_reactivated')

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при възстановяване на абонамент')
  }
}
