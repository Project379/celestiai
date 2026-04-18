// Main entry point for @celestia/core.
//
// Prefer subpath imports (e.g. `@celestia/core/crystals/today`) when
// possible — they're stable across refactors and keep bundle-level
// dead-code elimination simple. This barrel export exists for
// convenience and tests.

export { getLunarPhase, ALL_LUNAR_PHASES } from './lib/moon-phase'
export type { LunarPhase, LunarPhaseId } from './lib/moon-phase'

export { createCoreSupabaseClient } from './lib/supabase'

export { fetchCatalog } from './crystals/queries'
export type { CatalogRow } from './crystals/queries'

export { getCrystalOfTheDay } from './crystals/today'
export {
  CrystalRowSchema,
  LunarPhaseSummarySchema,
  StreakSchema,
  CrystalOfTheDayResponseSchema,
} from './crystals/schemas'
export type {
  CrystalRow,
  LunarPhaseSummary,
  Streak,
  CrystalOfTheDayResponse,
} from './crystals/schemas'
