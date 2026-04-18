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

export const CrystalOfTheDayResponseSchema = z.object({
  crystal: CrystalRowSchema,
  lunarPhase: LunarPhaseSummarySchema,
  streak: StreakSchema.nullable(),
  isPremium: z.boolean(),
  collectedToday: z.boolean(),
})

export type CrystalRow = z.infer<typeof CrystalRowSchema>
export type LunarPhaseSummary = z.infer<typeof LunarPhaseSummarySchema>
export type Streak = z.infer<typeof StreakSchema>
export type CrystalOfTheDayResponse = z.infer<typeof CrystalOfTheDayResponseSchema>
