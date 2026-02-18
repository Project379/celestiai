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
  | 'payment.webhook_received'

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
      metadata: metadata ?? {},
    })
  } catch (err) {
    // Never throw from audit logging — log to console and move on
    console.error('[Audit] Failed to log event:', eventType, err)
  }
}
