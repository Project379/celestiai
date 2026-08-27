import { createServiceSupabaseClient } from '@/lib/supabase/service'

export type AuditEventType =
  // Authentication
  | 'auth.sign_in'
  | 'auth.sign_out'
  | 'auth.password_reset'
  | 'auth.failed_attempt'
  // Data access
  | 'data.chart_calculation'
  | 'data.ai_reading'
  | 'data.horoscope_generation'
  // Account changes
  | 'account.birth_data_edit'
  | 'account.data_export'
  | 'account.deletion_request'
  | 'account.deletion_confirm'
  // Payment events
  | 'payment.subscription_created'
  | 'payment.subscription_cancelled'
  | 'payment.subscription_reactivated'
  | 'payment.invoice_payment_failed'
  | 'system.payment.webhook_received'
  | 'system.payment.webhook_ignored'
  | 'system.payment.quota_refund_failed'
  | 'system.security.stripe_ownership_mismatch'
  // RevenueCat (REVISIT-62)
  | 'system.payment.revenuecat_webhook_received'
  | 'system.payment.revenuecat_webhook_ignored'
  | 'system.payment.revenuecat_unexpected_non_renewing_purchase'
  // Relationship / circle
  | 'relationship.invite_created'
  | 'relationship.invite_cancelled'
  | 'relationship.connected'
  | 'relationship.archived'
  | 'relationship.report_generated'
  | 'relationship.saved_profile_created'
  | 'relationship.saved_profile_deleted'
  | 'relationship.saved_profile_report_generated'

/**
 * De-identify re-identification handles before they land in a retained log.
 *
 * `audit_logs.user_id` is `ON DELETE SET NULL` (verified against production
 * pg_constraint 2026-08-27) — audit rows survive account deletion. That is
 * fine for an ops/security trail, but only if the *payload* is also
 * de-identified: a Stripe `cus_…` / `sub_…` / `in_…` id resolves to a named
 * person (name, email, card) at Stripe, and a raw Clerk `user_…` id in a
 * `user_id = null` row re-attaches it to a person. Neither should sit in a
 * row that outlives the account.
 *
 * Shape-based, not key-name-based, so ids buried in a spread `...metadata`
 * are caught too. Keeps `prefix_…last4` so two audit rows can still be
 * correlated in an investigation; drops the part that makes the id a
 * lookup key. Stripe's API has no partial-id search, so `cus_…a1b2` is not
 * resolvable.
 */
const ID_LIKE =
  /^(cus|sub|in|pi|ch|price|prod|seti|src|txn|re|il|py|user)_[A-Za-z0-9]{6,}$/

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    const m = ID_LIKE.exec(value)
    if (!m) return value
    return `${m[1]}_…${value.slice(-4)}`
  }
  if (Array.isArray(value)) return value.map(redactValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redactValue(v)]),
    )
  }
  return value
}

export async function logAuditEvent(
  userId: string | null,
  eventType: AuditEventType,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = createServiceSupabaseClient()
    await supabase.from('audit_logs').insert({
      user_id: userId,
      event_type: eventType,
      metadata: metadata ? (redactValue(metadata) as Record<string, unknown>) : {},
    })
  } catch (err) {
    // Never throw from audit logging - log to console and move on
    console.error('[Audit] Failed to log event:', eventType, err)
  }
}
