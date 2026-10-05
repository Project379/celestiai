/**
 * Chart-version helpers (Batch 8 "b", web).
 *
 * A birth-data edit bumps `charts.birth_data_edited_at`. Everything the web
 * client caches that is derived from the chart — SWR entries, the horoscope
 * localStorage cache, component state that fetched on mount — is made to follow
 * that marker by putting it in the cache KEY, so an edit (here, or on another
 * device and noticed on window focus) changes the keys and the stale entries are
 * simply never read again. This module holds the pure, DOM-free parts so they
 * can be unit-tested; the React wiring is in components/birth-data/ChartVersion.tsx.
 *
 * Mobile counterpart: the shared invalidation helper + foreground version
 * check (apps/mobile), same marker, same rule.
 */

export const HOROSCOPE_STORAGE_PREFIX = 'daily-horoscope:'

/**
 * localStorage key for a cached daily horoscope. The marker is part of the key,
 * so a horoscope cached before an edit can never be hydrated after it (it was
 * generated from the old chart). `editedAt` null (no chart yet) still yields a
 * stable key.
 */
export function horoscopeStorageKey(chartId: string, editedAt: string | null, date: string): string {
  return `${HOROSCOPE_STORAGE_PREFIX}${chartId}:${editedAt ?? 'none'}:${date}`
}

/** Minimal storage surface (a subset of the DOM Storage) so the sweeps are testable. */
export interface KeyValueStorage {
  readonly length: number
  key(index: number): string | null
  removeItem(key: string): void
}

function horoscopeKeys(storage: KeyValueStorage): string[] {
  const keys: string[] = []
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i)
    if (key && key.startsWith(HOROSCOPE_STORAGE_PREFIX)) keys.push(key)
  }
  return keys
}

/**
 * Removes every cached horoscope for this chart that was written under a
 * DIFFERENT marker (and any legacy `daily-horoscope:{chartId}:{date}` key
 * written before the marker existed). Keeps entries for the current marker.
 */
export function sweepStaleHoroscopeEntries(
  storage: KeyValueStorage,
  chartId: string,
  editedAt: string | null,
): number {
  const currentPrefix = `${HOROSCOPE_STORAGE_PREFIX}${chartId}:${editedAt ?? 'none'}:`
  let removed = 0
  for (const key of horoscopeKeys(storage)) {
    if (key.startsWith(`${HOROSCOPE_STORAGE_PREFIX}${chartId}:`) && !key.startsWith(currentPrefix)) {
      storage.removeItem(key)
      removed++
    }
  }
  return removed
}

/** Removes every cached horoscope for ONE chart, whatever marker it was written under. */
export function clearHoroscopeEntriesForChart(storage: KeyValueStorage, chartId: string): number {
  let removed = 0
  for (const key of horoscopeKeys(storage)) {
    if (key.startsWith(`${HOROSCOPE_STORAGE_PREFIX}${chartId}:`)) {
      storage.removeItem(key)
      removed++
    }
  }
  return removed
}

/** Removes ALL cached horoscopes (every chart, every marker) — used on sign-out. */
export function clearAllHoroscopeEntries(storage: KeyValueStorage): number {
  const keys = horoscopeKeys(storage)
  for (const key of keys) storage.removeItem(key)
  return keys.length
}

/** Best-effort wrappers over window.localStorage (it can throw or be absent). */
export function sweepStaleHoroscopesInBrowser(chartId: string, editedAt: string | null): void {
  try {
    sweepStaleHoroscopeEntries(window.localStorage, chartId, editedAt)
  } catch {}
}

export function clearChartHoroscopesInBrowser(chartId: string): void {
  try {
    clearHoroscopeEntriesForChart(window.localStorage, chartId)
  } catch {}
}

export function clearAllHoroscopesInBrowser(): void {
  try {
    clearAllHoroscopeEntries(window.localStorage)
  } catch {}
}

// The comparison rule and throttle are shared with mobile (single source in core).
export {
  chartVersionChanged,
  shouldCheckVersion,
  VERSION_CHECK_MIN_INTERVAL_MS,
} from '@stellaeum/core/charts/version'
