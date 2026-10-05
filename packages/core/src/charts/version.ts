/**
 * Chart-version rule shared by web and mobile (Batch 8 "b").
 *
 * A birth-data edit bumps `charts.birth_data_edited_at`. A client that cached
 * anything derived from the chart notices an edit made elsewhere by comparing
 * the server's marker for the ACTIVE chart with the one it rendered with. Pure
 * and platform-free so both apps apply the identical rule.
 */

export interface ChartVersion {
  chartId: string | null
  editedAt: string | null
}

/**
 * True when the server's marker for the active chart differs from the one the
 * client is using — the chart was edited elsewhere (or just now). Any
 * difference counts, including the chart appearing/disappearing, because a
 * different active chart also invalidates everything derived from the old one.
 * Compared as instants, not strings (Postgres returns microseconds).
 */
export function chartVersionChanged(known: ChartVersion, latest: ChartVersion): boolean {
  if (known.chartId !== latest.chartId) return true
  if (known.editedAt === null || latest.editedAt === null) return known.editedAt !== latest.editedAt
  return new Date(known.editedAt).getTime() !== new Date(latest.editedAt).getTime()
}

/** Minimum gap between foreground/focus-triggered version checks (ms). */
export const VERSION_CHECK_MIN_INTERVAL_MS = 30_000

/** Whether enough time has passed since the last version check to run another. */
export function shouldCheckVersion(lastCheckedAt: number, now: number): boolean {
  return now - lastCheckedAt >= VERSION_CHECK_MIN_INTERVAL_MS
}
