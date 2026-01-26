import { pgTable, text, real, uuid, index } from 'drizzle-orm/pg-core'

/**
 * Bulgarian cities lookup table
 * Public read access - no RLS needed
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
  ]
)

export type City = typeof cities.$inferSelect
export type NewCity = typeof cities.$inferInsert
