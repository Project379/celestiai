import { createServiceSupabaseClient } from '@/lib/supabase/service'
import { getAppUserByClerkId } from '@/lib/users/ensure-user'
import { logAuditEvent } from '@/lib/audit'

/**
 * REVISIT-62 sub-commit D — RevenueCat webhook event handling.
 *
 * Event shape per RevenueCat's documented sample payloads: the POST body
 * is `{ event: {...}, api_version: "1.0" }` — every field below reads
 * from the nested `event` object, not the request root.
 *
 * Entitlement identifier ('premium') matches the RevenueCat dashboard
 * entitlement configured 2026-08-03 (REST id entl881fa25615 — that's the
 * REST API identifier, NOT what appears in webhook payloads; payloads
 * carry the human-readable `identifier` string, "premium").
 */

export const PREMIUM_ENTITLEMENT_ID = 'premium'

export type RevenueCatEventType =
  | 'TEST'
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'PRODUCT_CHANGE'
  | 'UNCANCELLATION'
  | 'CANCELLATION'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'NON_RENEWING_PURCHASE'

export interface RevenueCatEvent {
  id: string
  type: string
  app_user_id: string
  entitlement_ids: string[] | null
  expiration_at_ms: number | null
  period_type: 'TRIAL' | 'INTRO' | 'NORMAL' | 'PROMOTIONAL' | 'PREPAID' | null
  environment: 'SANDBOX' | 'PRODUCTION' | null
  product_id: string | null
}

function toIsoOrNull(ms: number | null): string | null {
  return typeof ms === 'number' ? new Date(ms).toISOString() : null
}

function hasPremiumEntitlement(event: RevenueCatEvent): boolean {
  return (event.entitlement_ids ?? []).includes(PREMIUM_ENTITLEMENT_ID)
}

async function grantPremium(
  event: RevenueCatEvent,
  status: 'active' | 'trialing'
): Promise<void> {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'premium',
      subscription_status: status,
      subscription_expires_at: toIsoOrNull(event.expiration_at_ms),
      subscription_provider: 'revenuecat',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', event.app_user_id)

  if (error) {
    throw new Error(
      `[RevenueCat Webhook] Failed to grant premium for ${event.app_user_id}: ${error.message}`
    )
  }
}

async function revokePremium(event: RevenueCatEvent): Promise<void> {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_tier: 'free',
      subscription_status: 'cancelled',
      subscription_expires_at: null,
      subscription_provider: 'revenuecat',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', event.app_user_id)

  if (error) {
    throw new Error(
      `[RevenueCat Webhook] Failed to revoke premium for ${event.app_user_id}: ${error.message}`
    )
  }
}

async function updateExpiryOnly(event: RevenueCatEvent, status: 'active'): Promise<void> {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: status,
      subscription_expires_at: toIsoOrNull(event.expiration_at_ms),
      subscription_provider: 'revenuecat',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', event.app_user_id)

  if (error) {
    throw new Error(
      `[RevenueCat Webhook] Failed to update subscription for ${event.app_user_id}: ${error.message}`
    )
  }
}

async function markPastDue(event: RevenueCatEvent): Promise<void> {
  const supabase = createServiceSupabaseClient()
  const { error } = await supabase
    .from('users')
    .update({
      subscription_status: 'past_due',
      subscription_provider: 'revenuecat',
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_id', event.app_user_id)

  if (error) {
    throw new Error(
      `[RevenueCat Webhook] Failed to mark past_due for ${event.app_user_id}: ${error.message}`
    )
  }
}

/**
 * Dispatches one RevenueCat webhook event. Returns without throwing for
 * every recognized case, including ones that intentionally do nothing
 * (TEST, CANCELLATION) — throwing is reserved for real failures the
 * caller should 500 on so RevenueCat retries delivery.
 */
export async function handleRevenueCatEvent(event: RevenueCatEvent): Promise<void> {
  const type = event.type as RevenueCatEventType

  // TEST: the dashboard-triggered verification ping. No real app_user_id,
  // nothing to look up, nothing to write — this is the whole reason this
  // webhook is buildable and testable before Apple enrollment.
  if (type === 'TEST') {
    console.log('[RevenueCat Webhook] TEST event received — verification ping, no-op')
    return
  }

  const user = await getAppUserByClerkId(event.app_user_id)
  if (!user) {
    // Real problem, not a normal case: every genuine purchase should have
    // gone through RevenueCatProvider's logIn(clerkUserId) first (REVISIT-62
    // sub-commit B), so app_user_id should always match an existing row.
    // Missing means logIn() didn't fire, or a test event used a made-up ID.
    await logAuditEvent(null, 'system.payment.revenuecat_webhook_ignored', {
      eventId: event.id,
      eventType: type,
      reason: 'unknown_app_user_id',
      appUserId: event.app_user_id,
    })
    console.warn(
      `[RevenueCat Webhook] No users row for app_user_id="${event.app_user_id}" (event ${event.id}, ${type}) — ignored, not an error`
    )
    return
  }

  switch (type) {
    case 'INITIAL_PURCHASE': {
      if (!hasPremiumEntitlement(event)) break
      await grantPremium(event, event.period_type === 'TRIAL' ? 'trialing' : 'active')
      await logAuditEvent(user.clerk_id, 'payment.subscription_created', {
        provider: 'revenuecat',
        eventId: event.id,
        productId: event.product_id,
      })
      break
    }

    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE': {
      if (!hasPremiumEntitlement(event)) break
      await updateExpiryOnly(event, 'active')
      break
    }

    case 'CANCELLATION': {
      // No tier change — RevenueCat's own semantics: the entitlement stays
      // active until expiration_at_ms actually passes. Mirrors how Stripe's
      // cancellation (cancel_at_period_end) isn't treated as the real
      // cutoff either — EXPIRATION is. Audit-log only.
      await logAuditEvent(user.clerk_id, 'payment.subscription_cancelled', {
        provider: 'revenuecat',
        eventId: event.id,
        note: 'entitlement remains active until expiration_at_ms',
      })
      break
    }

    case 'EXPIRATION': {
      // The real cutoff — mirrors handleSubscriptionDeleted.
      await revokePremium(event)
      await logAuditEvent(user.clerk_id, 'payment.subscription_cancelled', {
        provider: 'revenuecat',
        eventId: event.id,
        reason: 'expiration',
      })
      break
    }

    case 'BILLING_ISSUE': {
      await markPastDue(event)
      await logAuditEvent(user.clerk_id, 'payment.invoice_payment_failed', {
        provider: 'revenuecat',
        eventId: event.id,
      })
      break
    }

    case 'NON_RENEWING_PURCHASE': {
      // Defensive, per founder ratification: we don't offer lifetime at
      // P.11, but Test Store can still fire this (the lifetime product
      // stays configured, just unused in the paywall). A purchase
      // happened — grant it rather than silently drop paid access — but
      // flag loudly, since this path is untested/undesigned product-wise.
      if (!hasPremiumEntitlement(event)) break
      await grantPremium(event, 'active') // expiration_at_ms is null here — see the column comment on subscription_expires_at for why that's correct, not a bug.
      await logAuditEvent(user.clerk_id, 'system.payment.revenuecat_unexpected_non_renewing_purchase', {
        eventId: event.id,
        productId: event.product_id,
        environment: event.environment,
      })
      console.warn(
        `[RevenueCat Webhook] NON_RENEWING_PURCHASE granted for ${user.clerk_id} (event ${event.id}) — untested path, review before shipping lifetime for real`
      )
      break
    }

    default:
      await logAuditEvent(user.clerk_id, 'system.payment.revenuecat_webhook_ignored', {
        eventId: event.id,
        eventType: type,
        reason: 'unhandled_event_type',
      })
      console.log(`[RevenueCat Webhook] Unhandled event type: ${type}`)
  }
}
