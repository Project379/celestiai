import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Daily transit positions table
 *
 * Caches raw transit planet positions globally by date (same for all users).
 * One row per calendar date. Transit calculations are expensive; this avoids
 * recalculating for every user request on the same day.
 *
 * Note: No RLS policies — accessed via service role client only,
 * consistent with chart_calculations and ai_readings pattern.
 */
export const dailyTransits = pgTable('daily_transits', {
  id: uuid('id').defaultRandom().primaryKey(),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD' — unique per day
  planetPositions: jsonb('planet_positions').notNull(), // TransitData['planets']
  calculatedAt: timestamp('calculated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type DailyTransit = typeof dailyTransits.$inferSelect
export type NewDailyTransit = typeof dailyTransits.$inferInsert
