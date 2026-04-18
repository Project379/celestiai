// Transitional re-export shim — Phase M2 moved the implementation to
// @celestia/core/horoscope/transit-analysis. Existing apps/web importers
// keep working unchanged. Future work can migrate callers to
// `@celestia/core/horoscope/transit-analysis` directly and delete this file.
export {
  buildTransitOverview,
  transitOverviewToPromptText,
} from '@celestia/core/horoscope/transit-analysis'
export type {
  TransitOverview,
  ActiveTransitDetail,
  UpcomingTransitDetail,
  LunarEventDetail,
} from '@celestia/core/horoscope/transit-analysis'
