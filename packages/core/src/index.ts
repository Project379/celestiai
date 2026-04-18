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
export type { GetCrystalOfTheDayOptions } from './crystals/today'

export { getCurrentPlanets } from './planets/current'
export type { CurrentPlanet, CurrentPlanetsResponse } from './planets/current'

export { getStripeStatus } from './stripe/status'
export type { StripeStatusResponse } from './stripe/status'

export { getTransitsOverview } from './horoscope/transits'
export type { TransitsOverviewResult } from './horoscope/transits'
export {
  buildTransitOverview,
  transitOverviewToPromptText,
} from './horoscope/transit-analysis'
export type {
  TransitOverview,
  ActiveTransitDetail,
  UpcomingTransitDetail,
  LunarEventDetail,
} from './horoscope/transit-analysis'
export {
  CrystalRowSchema,
  LunarPhaseSummarySchema,
  StreakSchema,
  DailyCrystalEntrySchema,
  CrystalOfTheDayResponseSchema,
} from './crystals/schemas'
export type {
  CrystalRow,
  LunarPhaseSummary,
  Streak,
  DailyCrystalEntry,
  CrystalOfTheDayResponse,
} from './crystals/schemas'
