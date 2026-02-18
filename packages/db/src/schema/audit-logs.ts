import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core'

/**
 * Audit logs table
 *
 * Records sensitive operations for compliance and debugging.
 * Admin-only access via Supabase dashboard — no in-app UI.
 *
 * No RLS policies — accessed via service role client only.
 */
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id'),  // nullable for system events (e.g., cron)
  eventType: text('event_type').notNull(),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert
