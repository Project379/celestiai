// Main entry point for @stellaeum/core.
//
// Prefer subpath imports (e.g. `@stellaeum/core/crystals/today`) when
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

export { getSubscriptionTier } from './subscription/tier'
export type { SubscriptionTier } from './subscription/tier'
export {
  buildCompositeChartData,
  calculateCompatibilitySummary,
  calculateCrossChartAspects,
} from './relationships/compatibility'
export type {
  CompatibilitySummary,
  CompatibilityDomainKey,
  CompatibilityDomainResult,
  RelationshipType,
  CrossChartAspect,
  CompositeChartData,
} from './relationships/types'

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
