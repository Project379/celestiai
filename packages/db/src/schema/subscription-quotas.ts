import { sql } from 'drizzle-orm'
import {
  date,
  index,
  integer,
  pgPolicy,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { users } from './users'

export const subscriptionQuotas = pgTable(
  'subscription_quotas',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.clerkId, { onDelete: 'cascade' }),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    aiReadingsUsed: integer('ai_readings_used').notNull().default(0),
    aiReadingsLimit: integer('ai_readings_limit').notNull().default(3),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.periodStart] }),
    index('subscription_quotas_user_period_start_idx').on(
      table.userId,
      table.periodStart.desc()
    ),
    pgPolicy('subscription_quotas_owner_select', {
      for: 'select',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.jwt() ->> 'sub'`,
    }),
  ]
).enableRLS()

export type SubscriptionQuota = typeof subscriptionQuotas.$inferSelect
export type NewSubscriptionQuota = typeof subscriptionQuotas.$inferInsert
