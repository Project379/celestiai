import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import {
  handleCheckoutComplete,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaid,
} from '@/lib/stripe/subscription'

/**
 * POST /api/webhooks/stripe
 *
 * Processes Stripe webhook events for subscription lifecycle management.
 *
 * CRITICAL: Uses request.text() (raw body) — NEVER request.json().
 * Stripe signature verification requires the exact raw bytes sent.
 *
 * Idempotency: checks processed_webhook_events before processing.
 * Returns 500 on processing errors so Stripe retries delivery.
 * Returns 200 immediately for duplicate events.
 */
export async function POST(request: Request) {
  // CRITICAL: Read raw text body for signature verification
  // request.json() would re-parse and break the HMAC check
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

  // Idempotency check — return 200 immediately for already-processed events
  const { data: existing } = await supabase
    .from('processed_webhook_events')
    .select('id')
    .eq('stripe_event_id', event.id)
    .single()

  if (existing) {
    console.log(`[Webhook] Duplicate event ignored: ${event.id} (${event.type})`)
    return new Response('OK', { status: 200 })
  }

  // Process event — return 500 on error so Stripe retries
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Only process subscription checkouts — not one-time payments
        if (session.mode === 'subscription') {
          await handleCheckoutComplete(session)
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
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        // Log only — Stripe retries automatically; no action needed from us
        console.warn(
          `[Webhook] Invoice payment failed: ${event.id} — Stripe will retry`
        )
        break
      }

      default:
        // Unhandled event types are silently ignored
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    // Record successful processing for idempotency
    await supabase.from('processed_webhook_events').insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processed_at: new Date().toISOString(),
    })

    return new Response('OK', { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Webhook] Processing error for event ${event.id}:`, message)
    // Return 500 so Stripe retries delivery
    return new Response(`Processing error: ${message}`, { status: 500 })
  }
}
