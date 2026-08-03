import Stripe from 'stripe'
import { logAuditEvent } from '@/lib/audit'
import { stripe } from '@/lib/stripe/client'
import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { type AppUser, ensureUserRecord } from '@/lib/users/ensure-user'

export class StripeWebhookIgnoredError extends Error {
  constructor(
    message: string,
    public readonly metadata: Record<string, unknown>
  ) {
    super(message)
    this.name = 'StripeWebhookIgnoredError'
  }
}

/**
 * Get the subscription period end timestamp in milliseconds.
 *
 * In stripe@20.x, current_period_end moved from the Subscription object
 * to the SubscriptionItem level (sub.items.data[0].current_period_end).
 * Stripe timestamps are Unix seconds, so multiply by 1000 for JS Date.
 */
function getSubscriptionExpiry(sub: Stripe.Subscription): string {
  const item = sub.items.data[0]
  if (!item) {
    throw new Error(`[Webhook] No subscription items found for sub: ${sub.id}`)
  }
  return new Date(item.current_period_end * 1000).toISOString()
}

function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): 'active' | 'inactive' | 'cancelled' | 'past_due' | 'trialing' {
  if (status === 'active') return 'active'
  if (status === 'trialing') return 'trialing'
  if (status === 'past_due') return 'past_due'
  if (status === 'canceled') return 'cancelled'
  return 'inactive'
}

function getStripeId(
  value: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}

function getSubscriptionCustomerId(sub: Stripe.Subscription): string | null {
  return getStripeId(sub.customer)
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  return invoice.parent?.type === 'subscription_details'
    ? (invoice.parent.subscription_details?.subscription as string | undefined)
    : undefined
}

async function ignoreWebhook(
  reason: string,
  metadata: Record<string, unknown>,
  userId: string | null = null
): Promise<never> {
  await logAuditEvent(userId, 'system.payment.webhook_ignored', {
    reason,
    ...metadata,
  })

  throw new StripeWebhookIgnoredError(reason, metadata)
}

async function verifyStripeOwnership(
  user: AppUser,
  args: {
    stripeCustomerId: string | null
    stripeSubscriptionId: string | null
    eventType: string
    allowNewSubscription?: boolean
  }
): Promise<void> {
  const { stripeCustomerId, stripeSubscriptionId, eventType, allowNewSubscription } =
    args

  if (
    user.stripe_customer_id &&
    stripeCustomerId &&
    user.stripe_customer_id !== stripeCustomerId
  ) {
    await logAuditEvent(user.clerk_id, 'system.security.stripe_ownership_mismatch', {
      eventType,
      field: 'stripe_customer_id',
      localStripeCustomerId: user.stripe_customer_id,
      eventStripeCustomerId: stripeCustomerId,
      eventStripeSubscriptionId: stripeSubscriptionId,
    })
    await ignoreWebhook(
      'stripe_customer_mismatch',
      {
        eventType,
        localStripeCustomerId: user.stripe_customer_id,
        eventStripeCustomerId: stripeCustomerId,
        eventStripeSubscriptionId: stripeSubscriptionId,
      },
      user.clerk_id
    )
  }

  if (
    !allowNewSubscription &&
    user.stripe_subscription_id &&
    stripeSubscriptionId &&
    user.stripe_subscription_id !== stripeSubscriptionId
  ) {
    await logAuditEvent(user.clerk_id, 'system.security.stripe_ownership_mismatch', {
      eventType,
      field: 'stripe_subscription_id',
      localStripeSubscriptionId: user.stripe_subscription_id,
      eventStripeSubscriptionId: stripeSubscriptionId,
      eventStripeCustomerId: stripeCustomerId,
    })
    await ignoreWebhook(
      'stripe_subscription_mismatch',
      {
        eventType,
        localStripeSubscriptionId: user.stripe_subscription_id,
        eventStripeSubscriptionId: stripeSubscriptionId,
        eventStripeCustomerId: stripeCustomerId,
      },
      user.clerk_id
    )
  }
}

async function getVerifiedSubscriptionUser(
  sub: Stripe.Subscription,
  eventType: string,
  options: { allowNewSubscription?: boolean } = {}
): Promise<AppUser> {
  const clerkUserId = sub.metadata?.clerkUserId
  if (!clerkUserId) {
    await ignoreWebhook('missing_clerk_user_id', {
      eventType,
      stripeSubscriptionId: sub.id,
      stripeCustomerId: getSubscriptionCustomerId(sub),
    })
  }

  const user = await ensureUserRecord(clerkUserId)
  await verifyStripeOwnership(user, {
    eventType,
    stripeCustomerId: getSubscriptionCustomerId(sub),
    stripeSubscriptionId: sub.id,
    allowNewSubscription: options.allowNewSubscription,
  })

  return user
}

/**
 * Handle checkout.session.completed event.
 *
 * Links the Stripe customer/subscription after Checkout completes.
 * Premium is granted by invoice.paid, not this event.
 * clerkUserId is read from session metadata set by the checkout API.
 */
export async function handleCheckoutComplete(
  session: Stripe.Checkout.Session
): Promise<void> {
  const clerkUserId = session.metadata?.clerkUserId
  if (!clerkUserId) {
    return await ignoreWebhook('missing_clerk_user_id', {
      eventType: 'checkout.session.completed',
      stripeSessionId: session.id,
      stripeSubscriptionId: session.subscription,
      stripeCustomerId: getStripeId(session.customer),
    })
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  )
  const user = await ensureUserRecord(clerkUserId)
  const stripeCustomerId =
    getStripeId(session.customer) ?? getSubscriptionCustomerId(subscription)
  const isTrialCheckout =
    session.metadata?.checkoutType === 'trial' ||
    subscription.metadata?.checkoutType === 'trial' ||
    subscription.status === 'trialing'

  if (
    isTrialCheckout &&
    user.trial_claimed_at &&
    user.stripe_subscription_id !== subscription.id
  ) {
    await ignoreWebhook(
      'trial_already_claimed',
      {
        eventType: 'checkout.session.completed',
        stripeSessionId: session.id,
        stripeSubscriptionId: subscription.id,
        existingStripeSubscriptionId: user.stripe_subscription_id,
      },
      user.clerk_id
    )
  }

  await verifyStripeOwnership(user, {
    eventType: 'checkout.session.completed',
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    allowNewSubscription: true,
  })

  if (isTrialCheckout && !subscription.cancel_at_period_end) {
    await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    })
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      ...(isTrialCheckout
        ? {
            subscription_tier: 'premium',
            subscription_status: 'trialing',
            trial_claimed_at: user.trial_claimed_at ?? new Date().toISOString(),
          }
        : {}),
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: subscription.id,
      subscription_expires_at: getSubscriptionExpiry(subscription),
      subscription_provider: 'stripe',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', clerkUserId)

  if (error) {
    throw new Error(
      `[Webhook] handleCheckoutComplete: Supabase upsert failed for ${clerkUserId}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleCheckoutComplete: linked Stripe subscription ${subscription.id} to ${clerkUserId}${isTrialCheckout ? ' and activated trial' : ''}`
  )
}

/**
 * Handle customer.subscription.updated event.
 *
 * Syncs subscription status and identifiers.
 * Premium is granted by invoice.paid; terminal statuses revoke premium.
 */
export async function handleSubscriptionUpdated(
  sub: Stripe.Subscription
): Promise<void> {
  const user = await getVerifiedSubscriptionUser(
    sub,
    'customer.subscription.updated'
  )
  const shouldRevokePremium =
    sub.status === 'canceled' ||
    sub.status === 'unpaid' ||
    sub.status === 'incomplete_expired'
  const isTrialSubscription =
    sub.status === 'trialing' && sub.metadata?.checkoutType === 'trial'

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: shouldRevokePremium
        ? 'free'
        : isTrialSubscription
          ? 'premium'
          : user.subscription_tier,
      subscription_status: mapStripeSubscriptionStatus(sub.status),
      ...(isTrialSubscription && !user.trial_claimed_at
        ? { trial_claimed_at: new Date().toISOString() }
        : {}),
      stripe_customer_id: getSubscriptionCustomerId(sub),
      stripe_subscription_id: sub.id,
      subscription_expires_at: getSubscriptionExpiry(sub),
      subscription_provider: 'stripe',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', user.clerk_id)

  if (error) {
    throw new Error(
      `[Webhook] handleSubscriptionUpdated: Supabase update failed for ${user.clerk_id}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleSubscriptionUpdated: synced subscription ${sub.id} for ${user.clerk_id} (status: ${sub.status})`
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
  const user = await getVerifiedSubscriptionUser(
    sub,
    'customer.subscription.deleted'
  )

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      subscription_expires_at: null,
      subscription_provider: 'stripe',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', user.clerk_id)

  if (error) {
    throw new Error(
      `[Webhook] handleSubscriptionDeleted: Supabase update failed for ${user.clerk_id}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleSubscriptionDeleted: revoked premium for ${user.clerk_id} (sub: ${sub.id})`
  )
}

/**
 * Handle invoice.paid event.
 *
 * Refreshes premium status and expiry date on subscription renewal.
 * In stripe@20.x, the subscription is accessed via
 * invoice.parent.subscription_details.subscription.
 */
export async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) {
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const user = await getVerifiedSubscriptionUser(subscription, 'invoice.paid', {
    allowNewSubscription: true,
  })

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      stripe_customer_id: getSubscriptionCustomerId(subscription),
      stripe_subscription_id: subscription.id,
      subscription_expires_at: getSubscriptionExpiry(subscription),
      subscription_provider: 'stripe',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', user.clerk_id)

  if (error) {
    throw new Error(
      `[Webhook] handleInvoicePaid: Supabase update failed for ${user.clerk_id}: ${error.message}`
    )
  }

  console.log(
    `[Webhook] handleInvoicePaid: refreshed premium expiry for ${user.clerk_id} (sub: ${subscription.id})`
  )
}

/**
 * Handle invoice.payment_failed event.
 *
 * Marks user past_due only when premium AND expiry has lapsed; otherwise audit-only.
 * Stripe retries automatically — local state updates only when Stripe's grace
 * period has run out per our local expiry record.
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId = getInvoiceSubscriptionId(invoice)
  if (!subscriptionId) {
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const user = await getVerifiedSubscriptionUser(
    subscription,
    'invoice.payment_failed'
  )

  const now = Date.now()
  const expiresAt = user.subscription_expires_at
    ? new Date(user.subscription_expires_at).getTime()
    : null
  // REVISIT-62: subscription_expires_at IS NULL means something different
  // per provider (see the column comment in the 20260803122000 migration) —
  // this Stripe-specific "treat null-expiry as already-expired" reading
  // must never fire against a row RevenueCat currently owns.
  const shouldMarkPastDue =
    user.subscription_provider === 'stripe' &&
    user.subscription_tier === 'premium' &&
    (expiresAt === null || expiresAt <= now)

  if (!shouldMarkPastDue) {
    await logAuditEvent(user.clerk_id, 'payment.invoice_payment_failed', {
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: getSubscriptionCustomerId(subscription),
      subscriptionStatus: subscription.status,
      localSubscriptionTier: user.subscription_tier,
      localSubscriptionStatus: user.subscription_status,
      localSubscriptionExpiresAt: user.subscription_expires_at,
      localStateChanged: false,
    })

    console.warn(
      `[Webhook] handleInvoicePaymentFailed: payment failed for ${user.clerk_id}, local state unchanged (tier: ${user.subscription_tier}, expires: ${user.subscription_expires_at ?? 'none'})`
    )
    return
  }

  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
      stripe_customer_id: getSubscriptionCustomerId(subscription),
      stripe_subscription_id: subscription.id,
      subscription_expires_at: getSubscriptionExpiry(subscription),
      subscription_provider: 'stripe',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', user.clerk_id)

  if (error) {
    throw new Error(
      `[Webhook] handleInvoicePaymentFailed: Supabase update failed for ${user.clerk_id}: ${error.message}`
    )
  }

  await logAuditEvent(user.clerk_id, 'payment.invoice_payment_failed', {
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: getSubscriptionCustomerId(subscription),
    subscriptionStatus: subscription.status,
    localStateChanged: true,
  })

  console.warn(
    `[Webhook] handleInvoicePaymentFailed: marked ${user.clerk_id} past_due (sub: ${subscription.id})`
  )
}
