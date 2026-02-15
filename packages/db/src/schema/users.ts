import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Users table
 *
 * Stores Celestia users linked to their Clerk account.
 * Tracks subscription tier for feature gating (Phase 7 will add
 * Stripe/RevenueCat webhook integration).
 *
 * Note: No RLS policies — accessed via service role client only.
 * Full RLS + payment integration comes in Phase 7.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
