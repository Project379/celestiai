// Transitional re-export shim — Phase M2 moved the implementation to
// @stellaeum/core/horoscope/transit-analysis. Existing apps/web importers
// keep working unchanged. Future work can migrate callers to
// `@stellaeum/core/horoscope/transit-analysis` directly and delete this file.
export {
  buildTransitOverview,
  transitOverviewToPromptText,
} from '@stellaeum/core/horoscope/transit-analysis'
export type {
  TransitOverview,
  ActiveTransitDetail,
  UpcomingTransitDetail,
  LunarEventDetail,
} from '@stellaeum/core/horoscope/transit-analysis'
