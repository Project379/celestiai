import { sql } from 'drizzle-orm'
import {
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { users } from './users'

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.clerkId, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('push_subscriptions_user_id_idx').on(table.userId),
    pgPolicy('push_subscriptions_owner_all', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.jwt() ->> 'sub'`,
      withCheck: sql`${table.userId} = auth.jwt() ->> 'sub'`,
    }),
  ]
).enableRLS()

export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
