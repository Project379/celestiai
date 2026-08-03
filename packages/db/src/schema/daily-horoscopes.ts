import { sql } from 'drizzle-orm'
import {
  date,
  index,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { charts } from './charts'
import { users } from './users'

/**
 * Daily horoscopes table
 *
 * Stores cached AI-generated daily horoscope text per chart and calendar date.
 * One horoscope per chart per day (enforced by unique index on chart_id + date).
 * Cache key is Sofia local date (Europe/Sofia timezone) to avoid UTC mismatch.
 */
export const dailyHoroscopes = pgTable(
  'daily_horoscopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.clerkId, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    content: text('content').notNull(),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    modelVersion: text('model_version').notNull(),
  },
  (table) => [
    uniqueIndex('daily_horoscopes_chart_date_idx').on(
      table.chartId,
      table.date
    ),
    index('daily_horoscopes_chart_date_desc_idx').on(
      table.chartId,
      table.date.desc()
    ),
    index('daily_horoscopes_user_id_idx').on(table.userId),
    pgPolicy('daily_horoscopes_owner_all', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.jwt() ->> 'sub'`,
      withCheck: sql`${table.userId} = auth.jwt() ->> 'sub'`,
    }),
  ]
).enableRLS()

export type DailyHoroscope = typeof dailyHoroscopes.$inferSelect
export type NewDailyHoroscope = typeof dailyHoroscopes.$inferInsert
