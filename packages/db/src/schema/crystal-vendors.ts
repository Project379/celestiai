import {
  pgTable,
  text,
  timestamp,
  uuid,
  real,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core'
import { crystals } from './crystals'

/**
 * Crystal vendors (e-commerce partners)
 *
 * Future integration point for partner crystal/gemstone shops. The table
 * exists and is empty at launch — we just need the data model ready so the
 * first Bulgarian partnership can drop in without a migration.
 *
 * `integration_type` controls how the app surfaces listings:
 *   - 'affiliate': link out with UTM tags, partner handles checkout
 *   - 'dropship': we charge via Stripe, partner fulfils via API
 *   - 'sponsored': flat fee placements, no revenue share
 *
 * No RLS — admin-managed reference data.
 */
export const crystalVendors = pgTable('crystal_vendors', {
  id: uuid('id').defaultRandom().primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country').notNull().default('BG'), // 'BG' | 'US' | 'GB' | ...
  integrationType: text('integration_type').notNull().default('affiliate'), // 'affiliate' | 'dropship' | 'sponsored'
  website: text('website'),
  apiConfig: jsonb('api_config').$type<Record<string, unknown>>(), // keys, endpoints, feature flags
  active: boolean('active').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type CrystalVendor = typeof crystalVendors.$inferSelect
export type NewCrystalVendor = typeof crystalVendors.$inferInsert

/**
 * Crystal listings (vendor catalog rows)
 *
 * One row per crystal × vendor pairing. Same crystal can be offered by
 * multiple vendors at different prices; app picks the best active listing.
 *
 * All fields other than foreign keys are nullable so the table can hold
 * partial data while a vendor API integration is still being wired up.
 */
export const crystalListings = pgTable('crystal_listings', {
  id: uuid('id').defaultRandom().primaryKey(),
  crystalId: uuid('crystal_id')
    .notNull()
    .references(() => crystals.id, { onDelete: 'cascade' }),
  vendorId: uuid('vendor_id')
    .notNull()
    .references(() => crystalVendors.id, { onDelete: 'cascade' }),
  sku: text('sku'),
  priceBgn: real('price_bgn'),
  priceOriginal: real('price_original'),
  currency: text('currency').notNull().default('BGN'),
  affiliateUrl: text('affiliate_url'),
  productUrl: text('product_url'),
  imageUrl: text('image_url'),
  inStock: boolean('in_stock'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export type CrystalListing = typeof crystalListings.$inferSelect
export type NewCrystalListing = typeof crystalListings.$inferInsert
