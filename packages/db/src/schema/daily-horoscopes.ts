import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { charts } from './charts'

/**
 * Daily horoscopes table
 *
 * Stores cached AI-generated daily horoscope text per chart and calendar date.
 * One horoscope per chart per day (enforced by unique index on chart_id + date).
 * Cache key is Sofia local date (Europe/Sofia timezone) to avoid UTC mismatch.
 *
 * Note: No RLS policies — accessed via service role client only,
 * consistent with chart_calculations and ai_readings pattern. Avoids needing
 * user JWT for server-side onFinish writes during streaming.
 */
export const dailyHoroscopes = pgTable(
  'daily_horoscopes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    date: text('date').notNull(), // 'YYYY-MM-DD' in Sofia timezone
    content: text('content').notNull(), // Full Bulgarian horoscope text
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    modelVersion: text('model_version').notNull(), // e.g. 'gemini-2.5-flash'
  },
  (table) => [
    // One horoscope per chart per day
    uniqueIndex('daily_horoscopes_chart_date_idx').on(
      table.chartId,
      table.date
    ),
  ]
)

export type DailyHoroscope = typeof dailyHoroscopes.$inferSelect
export type NewDailyHoroscope = typeof dailyHoroscopes.$inferInsert
