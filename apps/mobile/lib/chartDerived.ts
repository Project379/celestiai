import type { QueryClient } from '@tanstack/react-query'

/**
 * Every TanStack query whose data is derived from the user's chart. The app
 * runs with `staleTime: Infinity` and `refetchOnMount: false`, so after a
 * birth-data edit (here, or on another device) NONE of these refetch on their
 * own. This is the single list — add a new chart-derived query's key root here
 * or an edit will leave it stale.
 *
 *   chart                       natal calculation
 *   first-chart                 id / birth_date (sun sign, Ти icon) / birth_data_edited_at
 *   transit-overview            transits against the natal chart
 *   oracle-readings             saved Oracle readings (server hides pre-edit ones)
 *   daily-horoscope             today's / yesterday's Днес horoscope
 *   crystals-overview           recommendations are derived from the natal chart
 *   media-recommendations       (flag-gated, still chart-derived)
 *   circle-connection-spaces    space cache is recomputed server-side after a member edit
 *   circle-saved-profile-report saved-profile synastry vs the user's active chart
 *
 * Deliberately NOT here: crystal collection / streaks (user-owned, never touched
 * by an edit) and the saved-people profile LIST (not chart-derived).
 */
export const CHART_DERIVED_QUERY_ROOTS = [
  'chart',
  'first-chart',
  'transit-overview',
  'oracle-readings',
  'daily-horoscope',
  'crystals-overview',
  'media-recommendations',
  'circle-connection-spaces',
  'circle-saved-profile-report',
] as const

export function isChartDerivedQueryKey(queryKey: readonly unknown[]): boolean {
  return (CHART_DERIVED_QUERY_ROOTS as readonly unknown[]).includes(queryKey[0])
}

/**
 * Drops every chart-derived cache entry so nothing computed from the old chart
 * is shown again:
 *   - INACTIVE entries are removed outright. `invalidateQueries` alone would
 *     leave them cached, and with `refetchOnMount: false` they would never
 *     refetch when their screen next mounts.
 *   - ACTIVE entries (on screen now) are invalidated, which refetches them.
 */
export async function invalidateChartDerived(queryClient: QueryClient): Promise<void> {
  const predicate = (query: { queryKey: readonly unknown[] }) => isChartDerivedQueryKey(query.queryKey)
  queryClient.removeQueries({ predicate, type: 'inactive' })
  await queryClient.invalidateQueries({ predicate, type: 'active' })
}
