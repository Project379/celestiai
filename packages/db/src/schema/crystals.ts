import {
  pgTable,
  text,
  timestamp,
  uuid,
  real,
  jsonb,
} from 'drizzle-orm/pg-core'

/**
 * Crystals catalog (shared reference data)
 *
 * Canonical list of gemstones with astrological correspondences.
 * Content is authored/seeded, never user-generated. Bulgarian fields
 * are nullable so the catalog can ship with English content first and
 * receive a dedicated Bulgarian-skill translation pass afterwards.
 *
 * No RLS — catalog is globally readable via service-role client.
 */
export const crystals = pgTable('crystals', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(), // 'moonstone', 'rose-quartz'

  nameEn: text('name_en').notNull(),
  nameBg: text('name_bg'),
  taglineEn: text('tagline_en').notNull(),
  taglineBg: text('tagline_bg'),
  descriptionEn: text('description_en').notNull(),
  descriptionBg: text('description_bg'),

  // Astrological correspondences
  planet: text('planet'), // 'sun' | 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | null
  zodiacSigns: jsonb('zodiac_signs').notNull().default([]).$type<string[]>(), // ['aries', 'scorpio', ...]
  moonPhases: jsonb('moon_phases').notNull().default([]).$type<string[]>(), // ['full', 'new', 'waxing_gibbous', ...]
  element: text('element'), // 'fire' | 'water' | 'earth' | 'air' | 'ether'
  chakra: text('chakra'), // 'root' | 'sacral' | 'solar_plexus' | 'heart' | 'throat' | 'third_eye' | 'crown'

  // Mineralogy (authenticity)
  hardness: real('hardness'), // Mohs scale, nullable

  // Procedural rendering (no image assets)
  colorPrimary: text('color_primary').notNull(), // hex
  colorSecondary: text('color_secondary').notNull(), // hex
  colorAccent: text('color_accent'), // hex, optional highlight
  svgVariant: text('svg_variant').notNull().default('tumbled'), // 'cluster' | 'tumbled' | 'point' | 'sphere' | 'raw'

  // Collectibility
  rarity: text('rarity').notNull().default('common'), // 'common' | 'uncommon' | 'rare' | 'legendary'

  // Rich structured data — affirmations, intentions, pairings
  keywords: jsonb('keywords').notNull().default([]).$type<string[]>(),
  properties: jsonb('properties').$type<{
    intentions?: string[]
    affirmationEn?: string
    affirmationBg?: string
    pairsWith?: string[]
  }>(),

  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type Crystal = typeof crystals.$inferSelect
export type NewCrystal = typeof crystals.$inferInsert
