import { date, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Daily transit positions table
 *
 * Caches raw transit planet positions globally by date (same for all users).
 * One row per calendar date. Transit calculations are expensive; this avoids
 * recalculating for every user request on the same day.
 */
export const dailyTransits = pgTable('daily_transits', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: date('date').notNull().unique(),
  planetPositions: jsonb('planet_positions').notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type DailyTransit = typeof dailyTransits.$inferSelect
export type NewDailyTransit = typeof dailyTransits.$inferInsert
