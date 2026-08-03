import { sql } from 'drizzle-orm'
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const subscriptionTierEnum = pgEnum('subscription_tier', [
  'free',
  'premium',
])

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'active',
  'inactive',
  'cancelled',
  'past_due',
  'trialing',
])

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
 *
 * Phase 8 additions: GDPR soft delete columns for account deletion
 * with 30-day grace period.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    clerkId: text('clerk_id').notNull().unique(),
    subscriptionTier: subscriptionTierEnum('subscription_tier')
      .notNull()
      .default('free'),
    subscriptionStatus: subscriptionStatusEnum('subscription_status')
      .notNull()
      .default('inactive'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    // Phase 7: Stripe integration columns
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id'),
    subscriptionExpiresAt: timestamp('subscription_expires_at', {
      withTimezone: true,
    }),
    trialClaimedAt: timestamp('trial_claimed_at', { withTimezone: true }),
    // Phase 8: GDPR soft delete columns
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletionScheduledAt: timestamp('deletion_scheduled_at', {
      withTimezone: true,
    }),
  },
  (table) => [
    index('users_stripe_customer_id_idx').on(table.stripeCustomerId),
    index('users_active_subscription_expires_at_idx')
      .on(table.subscriptionExpiresAt)
      .where(sql`${table.subscriptionStatus} = 'active'`),
  ]
)

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
