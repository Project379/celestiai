import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { crystals } from './crystals'

/**
 * Daily crystal log
 *
 * One row per (user, date) — records which crystal the user saw as their
 * "Камък на деня" on a given day. This is the backbone of the streak /
 * daily collection feature, separate from the sparse monthly collection
 * in `user_crystals`.
 *
 * A single row per day is enforced by the unique index on (user_id, date).
 * The same crystal can reappear on different days.
 */
export const userDailyCrystals = pgTable(
  'user_daily_crystals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk sub
    crystalId: uuid('crystal_id')
      .notNull()
      .references(() => crystals.id, { onDelete: 'cascade' }),
    /** YYYY-MM-DD, computed from user's local date on the server */
    date: text('date').notNull(),
    visitedAt: timestamp('visited_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_daily_crystals_user_date_idx').on(
      table.userId,
      table.date
    ),
    index('user_daily_crystals_user_idx').on(table.userId),
  ]
)

export type UserDailyCrystal = typeof userDailyCrystals.$inferSelect
export type NewUserDailyCrystal = typeof userDailyCrystals.$inferInsert
