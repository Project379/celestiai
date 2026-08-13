import { auth } from '@clerk/nextjs/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { logAuditEvent } from '@/lib/audit'
import { toErrorResponse } from '@/lib/auth/guards'
import { assertRateLimit } from '@/lib/rate-limit'

/**
 * POST /api/stripe/cancel
 * Cancels a subscription at period end (cancel_at_period_end: true).
 * Access continues until current_period_end.
 *
 * Auth: Required (Clerk)
 * Body: { reason?: string } - optional cancellation reason for product feedback
 * Returns: { success: true }
 */
export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) {
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  let reason: string | undefined
  try {
    const body = await req.json()
    reason = body?.reason
  } catch {
    // Body is optional - proceed without reason
  }

  try {
    await assertRateLimit({
      key: `stripe-cancel:${userId}`,
      limit: 5,
      windowMs: 60_000,
    })

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

    logAuditEvent(userId, 'payment.subscription_cancelled', { reason })

    if (reason) {
      console.log(`[Cancel] User ${userId} cancelled subscription. Reason: ${reason}`)
    }

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при отказ от абонамент')
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
    return Response.json({ error: 'Сесията ти изтече. Влез отново.' }, { status: 401 })
  }

  try {
    await assertRateLimit({
      key: `stripe-reactivate:${userId}`,
      limit: 5,
      windowMs: 60_000,
    })

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

    logAuditEvent(userId, 'payment.subscription_reactivated')

    return Response.json({ success: true })
  } catch (error) {
    return toErrorResponse(error, 'Грешка при възстановяване на абонамент')
  }
}
