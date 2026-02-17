import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/stripe/cancel
 * Cancels a subscription at period end (cancel_at_period_end: true).
 * Access continues until current_period_end.
 *
 * Auth: Required (Clerk)
 * Body: { reason?: string } — optional cancellation reason for product feedback
 * Returns: { success: true }
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  let reason: string | undefined
  try {
    const body = await req.json()
    reason = body?.reason
  } catch {
    // Body is optional — proceed without reason
  }

  try {
    const supabase = createServiceSupabaseClient()
    const { data: user } = await supabase
      .from('users')
      .select('stripe_subscription_id')
      .eq('clerk_id', userId)
      .single()

    const subscriptionId = user?.stripe_subscription_id
    if (!subscriptionId) {
      return Response.json({ error: 'Няма активен абонамент' }, { status: 400 })
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    })

    if (reason) {
      console.log(`[Cancel] User ${userId} cancelled subscription. Reason: ${reason}`)
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Stripe Cancel] Error cancelling subscription:', error)
    return Response.json({ error: 'Грешка при отказ от абонамент' }, { status: 500 })
  }
}

/**
 * DELETE /api/stripe/cancel
 * Reactivates a subscription by undoing cancel_at_period_end.
 * Sets cancel_at_period_end: false.
 *
 * Auth: Required (Clerk)
 * Returns: { success: true }
 */
export async function DELETE() {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Неоторизиран достъп' }, { status: 401 })
  }

  try {
    const supabase = createServiceSupabaseClient()
    const { data: user } = await supabase
      .from('users')
      .select('stripe_subscription_id')
      .eq('clerk_id', userId)
      .single()

    const subscriptionId = user?.stripe_subscription_id
    if (!subscriptionId) {
      return Response.json({ error: 'Няма активен абонамент' }, { status: 400 })
    }

    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Stripe Reactivate] Error reactivating subscription:', error)
    return Response.json({ error: 'Грешка при възстановяване на абонамент' }, { status: 500 })
  }
}
