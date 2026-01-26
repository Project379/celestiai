import { sql } from 'drizzle-orm'
import {
  pgTable,
  text,
  timestamp,
  real,
  boolean,
  uuid,
  pgPolicy,
} from 'drizzle-orm/pg-core'
import { authenticatedRole } from 'drizzle-orm/supabase'
import { cities } from './cities'

/**
 * Birth charts table with Row Level Security
 * Users can only access their own charts via Clerk JWT sub claim
 */
export const charts = pgTable(
  'charts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id')
      .notNull()
      .default(sql`(select auth.jwt()->>'sub')`),
    name: text('name').notNull(), // Chart label like "Moiata karta"
    birthDate: timestamp('birth_date', { withTimezone: true }).notNull(),
    birthTimeKnown: boolean('birth_time_known').notNull().default(true),
    birthTime: text('birth_time'), // HH:MM format, null if unknown
    approximateTimeRange: text('approximate_time_range'), // 'morning'|'afternoon'|'evening'|'night'
    cityId: uuid('city_id').references(() => cities.id),
    cityName: text('city_name').notNull(),
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Enable RLS - users can only select their own charts
    pgPolicy('charts_select_own', {
      for: 'select',
      to: authenticatedRole,
      using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
    // Users can only insert charts for themselves
    pgPolicy('charts_insert_own', {
      for: 'insert',
      to: authenticatedRole,
      withCheck: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
    // Users can only update their own charts
    pgPolicy('charts_update_own', {
      for: 'update',
      to: authenticatedRole,
      using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
      withCheck: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
    // Users can only delete their own charts
    pgPolicy('charts_delete_own', {
      for: 'delete',
      to: authenticatedRole,
      using: sql`(select auth.jwt()->>'sub') = ${table.userId}`,
    }),
  ]
).enableRLS()

export type Chart = typeof charts.$inferSelect
export type NewChart = typeof charts.$inferInsert
