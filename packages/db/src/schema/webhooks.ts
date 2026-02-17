import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Processed webhook events table
 *
 * Provides idempotency for Stripe webhook processing.
 * Prevents duplicate event handling if Stripe retries delivery.
 *
 * No RLS policies — accessed via service role client only.
 */
export const processedWebhookEvents = pgTable('processed_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  eventType: text('event_type').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ProcessedWebhookEvent = typeof processedWebhookEvents.$inferSelect
export type NewProcessedWebhookEvent = typeof processedWebhookEvents.$inferInsert
