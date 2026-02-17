import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'

/**
 * Get the subscription period end timestamp in milliseconds.
 *
 * In stripe@20.x, current_period_end moved from the Subscription object
 * to the SubscriptionItem level (sub.items.data[0].current_period_end).
 * Stripe timestamps are Unix seconds — multiply by 1000 for JS Date.
 */
function getSubscriptionExpiry(sub: Stripe.Subscription): string {
  const item = sub.items.data[0]
  if (!item) {
    throw new Error(`[Webhook] No subscription items found for sub: ${sub.id}`)
  }
  // current_period_end is on SubscriptionItem in stripe@20.x (Unix seconds)
  return new Date(item.current_period_end * 1000).toISOString()
}

/**
 * Handle checkout.session.completed event.
 *
 * Grants premium access after a successful subscription checkout.
 * clerkUserId is read from session.metadata — set by the checkout API.
 */
export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<void> {
  const clerkUserId = session.metadata?.clerkUserId
  if (!clerkUserId) {
    throw new Error(
      `[Webhook] handleCheckoutComplete: missing clerkUserId in session metadata (session: ${session.id})`
    )
  }

  // Retrieve the full subscription to get period end and subscription ID
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      subscription_expires_at: getSubscriptionExpiry(subscription),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)

  if (error) {
    throw new Error(
      `[Webhook] handleCheckoutComplete: Supabase update failed for ${clerkUserId}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleCheckoutComplete: granted premium to ${clerkUserId}, subscription ${subscription.id}`
  )
}

/**
 * Handle customer.subscription.updated event.
 *
 * Updates subscription tier based on current status.
 * Active and trialing statuses grant premium; all others revert to free.
 */
export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) {
    throw new Error(
      `[Webhook] handleSubscriptionUpdated: missing clerkUserId in subscription metadata (sub: ${sub.id})`
    )
  }

  const tier =
    sub.status === 'active' || sub.status === 'trialing' ? 'premium' : 'free'

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: tier,
      stripe_subscription_id: sub.id,
      subscription_expires_at: getSubscriptionExpiry(sub),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)

  if (error) {
    throw new Error(
      `[Webhook] handleSubscriptionUpdated: Supabase update failed for ${clerkUserId}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleSubscriptionUpdated: set tier=${tier} for ${clerkUserId} (status: ${sub.status})`
  )
}

/**
 * Handle customer.subscription.deleted event.
 *
 * Revokes premium access and clears subscription identifiers.
 */
export async function handleSubscriptionDeleted(
  sub: Stripe.Subscription
): Promise<void> {
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) {
    throw new Error(
      `[Webhook] handleSubscriptionDeleted: missing clerkUserId in subscription metadata (sub: ${sub.id})`
    )
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      stripe_subscription_id: null,
      subscription_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)

  if (error) {
    throw new Error(
      `[Webhook] handleSubscriptionDeleted: Supabase update failed for ${clerkUserId}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleSubscriptionDeleted: revoked premium for ${clerkUserId} (sub: ${sub.id})`
  )
}

/**
 * Handle invoice.paid event.
 *
 * Refreshes premium status and expiry date on subscription renewal.
 * Non-throwing on missing metadata — invoice events can be noisy (e.g. one-time charges).
 *
 * In stripe@20.x, the subscription is accessed via
 * invoice.parent.subscription_details.subscription (not invoice.subscription).
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  // In stripe@20.x, subscription info is nested under invoice.parent
  const subscriptionId =
    invoice.parent?.type === 'subscription_details'
      ? (invoice.parent.subscription_details?.subscription as string | undefined)
      : undefined

  if (!subscriptionId) {
    // Not a subscription invoice (e.g. one-time charge) — skip
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  const clerkUserId = subscription.metadata?.clerkUserId
  if (!clerkUserId) {
    // Invoice events can come from non-Celestia subscriptions — log and skip
    console.warn(
      `[Webhook] handleInvoicePaid: missing clerkUserId in subscription metadata (sub: ${subscription.id}) — skipping`
    )
    return
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_expires_at: getSubscriptionExpiry(subscription),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)

  if (error) {
    throw new Error(
      `[Webhook] handleInvoicePaid: Supabase update failed for ${clerkUserId}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleInvoicePaid: refreshed premium expiry for ${clerkUserId} (sub: ${subscription.id})`
  )
}
