import { z } from 'zod'

/**
 * Zod schemas for the crystal-of-the-day flow. The output schema is the
 * wire contract shared between:
 *   - packages/core internal function return value
 *   - apps/web Server Component consumption
 *   - apps/web route-handler Response.json() payload
 *   - apps/mobile HTTP client response validation
 *   - (future) apps/mobile typed parsing
 *
 * If you change this schema, every consumer sees the new shape on next build.
 */

export const CrystalRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name_en: z.string(),
  name_bg: z.string().nullable(),
  tagline_en: z.string(),
  tagline_bg: z.string().nullable(),
  description_en: z.string(),
  description_bg: z.string().nullable(),
  color_primary: z.string(),
  color_secondary: z.string(),
  color_accent: z.string().nullable(),
  svg_variant: z.string(),
  rarity: z.string(),
})

export const LunarPhaseSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  latin: z.string(),
  illumination: z.number(),
})

export const StreakSchema = z.object({
  current: z.number().int().nonnegative(),
  longest: z.number().int().nonnegative(),
  totalDays: z.number().int().nonnegative(),
})

/**
 * One entry in the 60-day daily-crystals history. Populated only when
 * the caller passes `includeHistory: true` to getCrystalOfTheDay —
 * otherwise omitted entirely from the response. Crystal metadata comes
 * via a FK-joined select on the `crystals` table; if the joined row is
 * missing (legacy/orphaned entry), the metadata fields are null.
 */
export const DailyCrystalEntrySchema = z.object({
  date: z.string(),
  crystal_id: z.string(),
  slug: z.string().nullable(),
  name_en: z.string().nullable(),
  name_bg: z.string().nullable(),
  color_primary: z.string().nullable(),
  color_secondary: z.string().nullable(),
  color_accent: z.string().nullable(),
  svg_variant: z.string().nullable(),
})

export const CrystalOfTheDayResponseSchema = z.object({
  crystal: CrystalRowSchema,
  lunarPhase: LunarPhaseSummarySchema,
  streak: StreakSchema.nullable(),
  isPremium: z.boolean(),
  collectedToday: z.boolean(),
  today: z.string(),
  // Optional 60-day history, populated only when includeHistory:true is
  // passed to getCrystalOfTheDay. Absent on the default path to keep the
  // response minimal.
  days: z.array(DailyCrystalEntrySchema).optional(),
})

export type CrystalRow = z.infer<typeof CrystalRowSchema>
export type LunarPhaseSummary = z.infer<typeof LunarPhaseSummarySchema>
export type Streak = z.infer<typeof StreakSchema>
export type DailyCrystalEntry = z.infer<typeof DailyCrystalEntrySchema>
export type CrystalOfTheDayResponse = z.infer<typeof CrystalOfTheDayResponseSchema>
