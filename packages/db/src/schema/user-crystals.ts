import {
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { crystals } from './crystals'

/**
 * User crystal collection
 *
 * Which crystals a user has discovered and added to their collection.
 * A user can hold each crystal at most once — collection is a set, not a count.
 *
 * `source` records the trigger that unlocked the crystal so we can surface
 * "how did I get this?" copy in the detail drawer.
 *
 * No RLS — written by API routes via service-role client (matches ai_readings
 * / daily_horoscopes pattern for server-side onFinish writes).
 */
export const userCrystals = pgTable(
  'user_crystals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(), // Clerk sub
    crystalId: uuid('crystal_id')
      .notNull()
      .references(() => crystals.id, { onDelete: 'cascade' }),
    source: text('source').notNull(), // 'signup' | 'phase' | 'transit' | 'chart' | 'ritual' | 'manual'
    reasonText: text('reason_text'), // "Your Scorpio full moon stone" — optional provenance
    discoveredAt: timestamp('discovered_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex('user_crystals_user_crystal_idx').on(
      table.userId,
      table.crystalId
    ),
  ]
)

export type UserCrystal = typeof userCrystals.$inferSelect
export type NewUserCrystal = typeof userCrystals.$inferInsert
