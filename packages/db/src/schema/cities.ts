import { sql } from 'drizzle-orm'
import { pgTable, text, real, uuid, index, pgPolicy } from 'drizzle-orm/pg-core'
import { anonRole, authenticatedRole } from 'drizzle-orm/supabase'

/**
 * Bulgarian cities lookup table
 * Public read access for all users (reference data)
 * Data seeded from SimpleMaps (MIT license)
 */
export const cities = pgTable(
  'bulgarian_cities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(), // Bulgarian name
    nameAscii: text('name_ascii').notNull(), // ASCII for search
    oblast: text('oblast').notNull(), // Region/province
    ekatte: text('ekatte'), // National code (optional)
    type: text('type').notNull(), // 'city' | 'town' | 'village'
    latitude: real('latitude').notNull(),
    longitude: real('longitude').notNull(),
    population: real('population'),
  },
  (table) => [
    index('cities_name_ascii_idx').on(table.nameAscii),
    index('cities_type_idx').on(table.type),
    // Allow authenticated users to read cities
    pgPolicy('cities_select_authenticated', {
      for: 'select',
      to: authenticatedRole,
      using: sql`true`,
    }),
    // Allow anon users to read cities (public reference data)
    pgPolicy('cities_select_anon', {
      for: 'select',
      to: anonRole,
      using: sql`true`,
    }),
  ]
).enableRLS()

export type City = typeof cities.$inferSelect
export type NewCity = typeof cities.$inferInsert
