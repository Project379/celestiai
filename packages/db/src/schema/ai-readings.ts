import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { charts } from './charts'

/**
 * AI readings table
 *
 * Stores cached AI-generated natal chart readings per chart and topic.
 * Readings expire after 7 days and can be regenerated once per day.
 * One live reading per chart-topic pair (enforced by unique index).
 *
 * Note: No RLS policies — accessed via service role client only,
 * consistent with chart_calculations pattern. Avoids needing user JWT
 * for server-side onFinish writes during streaming.
 */
export const aiReadings = pgTable(
  'ai_readings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    topic: text('topic').notNull(), // 'general' | 'love' | 'career' | 'health'
    content: text('content').notNull(), // Full reading with sentinels stripped
    teaserContent: text('teaser_content'), // Short preview for locked topics (nullable)
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(), // generated_at + 7 days
    lastRegeneratedAt: timestamp('last_regenerated_at', {
      withTimezone: true,
    }), // nullable
    modelVersion: text('model_version').notNull(), // e.g. 'gemini-2.5-flash'
  },
  (table) => [
    // One live reading per chart-topic pair
    uniqueIndex('ai_readings_chart_id_topic_idx').on(
      table.chartId,
      table.topic
    ),
  ]
)

export type AiReading = typeof aiReadings.$inferSelect
export type NewAiReading = typeof aiReadings.$inferInsert
