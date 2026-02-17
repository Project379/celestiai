import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Users table
 *
 * Stores Celestia users linked to their Clerk account.
 * Tracks subscription tier for feature gating.
 *
 * Note: No RLS policies — accessed via service role client only.
 *
 * Phase 7 additions: Stripe customer/subscription columns for
 * webhook-driven subscription lifecycle management.
 */
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  subscriptionTier: text('subscription_tier').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Phase 7: Stripe integration columns
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionExpiresAt: timestamp('subscription_expires_at', { withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
