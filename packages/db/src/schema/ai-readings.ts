import { sql } from 'drizzle-orm'
import {
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
 * AI readings table
 *
 * Stores cached AI-generated natal chart readings per chart and topic.
 * Readings expire after 7 days and can be regenerated once per day.
 */
export const aiReadings = pgTable(
  'ai_readings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    chartId: uuid('chart_id')
      .notNull()
      .references(() => charts.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.clerkId, { onDelete: 'cascade' }),
    topic: text('topic').notNull(),
    content: text('content').notNull(),
    teaserContent: text('teaser_content'),
    generatedAt: timestamp('generated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastRegeneratedAt: timestamp('last_regenerated_at', {
      withTimezone: true,
    }),
    modelVersion: text('model_version').notNull(),
  },
  (table) => [
    uniqueIndex('ai_readings_chart_id_topic_idx').on(
      table.chartId,
      table.topic
    ),
    index('ai_readings_chart_id_idx').on(table.chartId),
    index('ai_readings_expires_at_idx').on(table.expiresAt),
    index('ai_readings_chart_topic_expires_at_idx').on(
      table.chartId,
      table.topic,
      table.expiresAt.desc()
    ),
    pgPolicy('ai_readings_owner_all', {
      for: 'all',
      to: authenticatedRole,
      using: sql`${table.userId} = auth.jwt() ->> 'sub'`,
      withCheck: sql`${table.userId} = auth.jwt() ->> 'sub'`,
    }),
  ]
).enableRLS()

export type AiReading = typeof aiReadings.$inferSelect
export type NewAiReading = typeof aiReadings.$inferInsert
