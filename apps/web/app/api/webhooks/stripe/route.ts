import { after } from 'next/server'
import Stripe from 'stripe'
import { logAuditEvent } from '@/lib/audit'
import { stripe } from '@/lib/stripe/client'
import {
  handleCheckoutComplete,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
  StripeWebhookIgnoredError,
} from '@/lib/stripe/subscription'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * POST /api/webhooks/stripe
 *
 * Processes Stripe webhook events for subscription lifecycle management.
 *
 * CRITICAL: Uses request.text() (raw body), never request.json().
 * Stripe signature verification requires the exact raw bytes sent.
 *
 * Idempotency: checks processed_webhook_events before processing; marks
 * processed on success AND on StripeWebhookIgnoredError so Stripe stops retrying
 * intentionally-ignored events. Returns 500 only on real processing errors.
 *
 * Not rate-limited: request authenticity is enforced via Stripe signature
 * verification (constructEvent below), a stronger control than a request-count
 * limit here. If this handler ever accepts requests without signature
 * verification, it needs rate limiting.
 */
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Webhook] Signature verification failed:', message)
    return new Response(`Webhook signature verification failed: ${message}`, {
      status: 400,
    })
  }

  const supabase = createServiceSupabaseClient()

  const { data: existing } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    console.log(`[Webhook] Duplicate event ignored: ${event.id} (${event.type})`)
    return new Response('OK', { status: 200 })
  }

  const eventId = event.id
  const eventType = event.type
  after(() =>
    logAuditEvent(null, 'system.payment.webhook_received', {
      eventType,
      eventId,
    })
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription') {
          await handleCheckoutComplete(session)
          const clerkUserId = session.metadata?.clerkUserId ?? null
          const stripeSubscriptionId = session.subscription
          after(() =>
            logAuditEvent(clerkUserId, 'payment.subscription_created', {
              stripeSubscriptionId,
            })
          )
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(sub)
        const clerkUserId = sub.metadata?.clerkUserId ?? null
        const stripeSubscriptionId = sub.id
        after(() =>
          logAuditEvent(clerkUserId, 'payment.subscription_cancelled', {
            stripeSubscriptionId,
          })
        )
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        after(() =>
          logAuditEvent(null, 'system.payment.webhook_ignored', {
            eventType,
            eventId,
            reason: 'unhandled_event_type',
          })
        )
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    await supabase.from('processed_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })

    return new Response('OK', { status: 200 })
  } catch (err) {
    if (err instanceof StripeWebhookIgnoredError) {
      console.warn(
        `[Webhook] Ignored event ${event.id} (${event.type}): ${err.message}`,
        err.metadata
      )
      await supabase.from('processed_webhook_events').insert({
        stripe_event_id: event.id,
        event_type: event.type,
        processed_at: new Date().toISOString(),
      })
      return new Response('OK', { status: 200 })
    }

    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Webhook] Processing error for event ${event.id}:`, message)
    return new Response(`Processing error: ${message}`, { status: 500 })
  }
}
