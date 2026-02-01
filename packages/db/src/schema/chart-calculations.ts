import {
  pgTable,
  uuid,
  jsonb,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { charts } from './charts'

/**
 * Cached chart calculations table
 *
 * This table stores calculated natal chart data to avoid recalculating
 * for the same birth data. Linked to charts table via chart_id.
 *
 * Note: No RLS policies - this is an internal cache table accessed
 * only via API routes using service role client.
 */
export const chartCalculations = pgTable('chart_calculations', {
  id: uuid('id').defaultRandom().primaryKey(),
  chartId: uuid('chart_id')
    .notNull()
    .references(() => charts.id, { onDelete: 'cascade' })
    .unique(), // One calculation per chart
  planetPositions: jsonb('planet_positions').notNull(), // PlanetPosition[]
  houseCusps: jsonb('house_cusps').notNull(), // HouseData[]
  aspects: jsonb('aspects').notNull(), // AspectData[]
  ascendant: jsonb('ascendant').notNull(), // PointData
  mc: jsonb('mc').notNull(), // PointData
  birthTimeKnown: boolean('birth_time_known').notNull(),
  calculatedAt: timestamp('calculated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type ChartCalculation = typeof chartCalculations.$inferSelect
export type NewChartCalculation = typeof chartCalculations.$inferInsert
