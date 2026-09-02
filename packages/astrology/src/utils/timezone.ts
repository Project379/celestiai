/**
 * Timezone utilities for converting local birth time to UTC
 *
 * Astrology calculations require UTC time. Users enter their birth time
 * in local time, so we need to convert it based on the birth location's
 * timezone at the specific date of birth (including historical DST rules).
 *
 * DST-boundary correctness (Astrology Phase 2, Finding 1)
 * ------------------------------------------------------
 * `geo-tz` only resolves coordinates -> IANA zone name; it computes no
 * offsets. The offset comes from `Intl.DateTimeFormat` / ICU, which *is*
 * historically aware. The subtlety is *which instant* you ask ICU about:
 * a wall-clock time is not an instant until you know the offset, and the
 * offset can differ on the two sides of a DST transition. The old code
 * sampled the offset at "wall time interpreted as UTC", which is 2-3h
 * from the true instant and lands on the wrong side within ~1h of a
 * transition. `resolveZonedWallTime` below resolves iteratively and then
 * classifies genuinely-gap / genuinely-ambiguous wall times by round
 * trip, so callers are never silently handed one arbitrary reading.
 */

import { find as findTimezone } from 'geo-tz'

/** Result of converting a local wall-clock birth time to UTC. */
export interface LocalTimeToUTCResult {
  /** UTC time of day as decimal hours (0..24). */
  utcHours: number
  /** Calendar-day adjustment relative to the input date (-1, 0, or +1). */
  dayOffset: number
  /**
   * True when the local time falls in a DST fall-back repeated hour and
   * has two valid UTC readings. We deliberately pick the EARLIER
   * occurrence (still on DST, larger offset) — see `resolveZonedWallTime`.
   */
  ambiguous?: boolean
  /**
   * True when the local time falls in a DST spring-forward gap and never
   * actually occurred. We shift it forward across the gap (pre-transition
   * offset) — see `resolveZonedWallTime`.
   */
  nonexistent?: boolean
}

/**
 * Convert a local birth time to UTC decimal hours, accounting for the
 * timezone at the given coordinates on the given date.
 *
 * @param date - The birth date (only its UTC Y/M/D are read)
 * @param localTime - Birth time in HH:MM format (local time)
 * @param lat - Birth location latitude
 * @param lon - Birth location longitude
 *
 * @example
 * ```typescript
 * // Birth at 14:30 local time in Sofia, Bulgaria (UTC+3 in summer)
 * const result = localTimeToUTC(new Date('1990-06-15'), '14:30', 42.70, 23.32)
 * // result.utcHours = 11.5 (14:30 - 3 hours)
 * // result.dayOffset = 0
 * ```
 */
export function localTimeToUTC(
  date: Date,
  localTime: string,
  lat: number,
  lon: number
): LocalTimeToUTCResult {
  const localParts = localTime.split(':').map(Number)
  if (localParts.length < 2 || localParts.some((n) => Number.isNaN(n))) {
    throw new Error(`Invalid localTime: expected HH:MM, got "${localTime}"`)
  }
  const [localHours, localMinutes] = localParts as [number, number]

  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()

  // Look up timezone from coordinates.
  const timezones = findTimezone(lat, lon)
  if (!timezones || timezones.length === 0 || timezones[0] === undefined) {
    // No zone polygon matched (mid-ocean coordinates, bad data). There is
    // no better answer than treating the wall time as already-UTC; the
    // caller surfaces the reduced-accuracy disclaimer for unknown/uncertain
    // birth data regardless.
    return {
      utcHours: localHours + localMinutes / 60,
      dayOffset: 0,
    }
  }
  const timezone: string = timezones[0]

  const wallAsUTCms = Date.UTC(year, month - 1, day, localHours, localMinutes, 0)
  const resolved = resolveZonedWallTime(wallAsUTCms, timezone)

  const resolvedDate = new Date(resolved.utcMs)
  const utcHours =
    resolvedDate.getUTCHours() +
    resolvedDate.getUTCMinutes() / 60 +
    resolvedDate.getUTCSeconds() / 3600

  const inputDayStart = Date.UTC(year, month - 1, day)
  const resolvedDayStart = Date.UTC(
    resolvedDate.getUTCFullYear(),
    resolvedDate.getUTCMonth(),
    resolvedDate.getUTCDate()
  )
  const dayOffset = Math.round((resolvedDayStart - inputDayStart) / 86_400_000)

  const result: LocalTimeToUTCResult = { utcHours, dayOffset }
  if (resolved.ambiguous) result.ambiguous = true
  if (resolved.nonexistent) result.nonexistent = true
  return result
}

interface ResolvedWallTime {
  /** The chosen absolute instant, in epoch milliseconds. */
  utcMs: number
  ambiguous?: boolean
  nonexistent?: boolean
}

/**
 * Resolve a wall-clock time (expressed as `Date.UTC(...)` of its Y/M/D/h/m)
 * in `timezone` to an absolute instant, DST-transition-safe.
 *
 * Method:
 *  1. Read the zone offset a full day either side of the requested wall
 *     time. DST transitions are months apart and shift by an hour, so
 *     these two samples straddle at most one transition: `offA` is the
 *     pre-transition offset, `offB` the post-transition one (equal when no
 *     transition is near — the overwhelmingly common path).
 *  2. For each distinct candidate offset, form the instant `wall - offset`
 *     and check by round trip whether the zone offset at that instant
 *     really is that offset:
 *       - exactly one candidate round-trips -> unique correct instant
 *         (covers "no transition near" and "near a transition but not in
 *         it").
 *       - both round-trip -> fall-back repeated hour (AMBIGUOUS). We take
 *         the EARLIER occurrence: the larger (pre-transition, still-DST)
 *         offset. Deterministic, and the reading most people mean.
 *       - neither round-trips -> spring-forward gap (NONEXISTENT). We shift
 *         the wall time forward across the gap by using the smaller
 *         (post-transition standard) offset, which yields the later of the
 *         two candidate instants — matching Temporal's "compatible"
 *         disambiguation and luxon's default.
 */
function resolveZonedWallTime(
  wallAsUTCms: number,
  timezone: string
): ResolvedWallTime {
  const offA = zoneOffsetMinutes(wallAsUTCms - 86_400_000, timezone)
  const offB = zoneOffsetMinutes(wallAsUTCms + 86_400_000, timezone)
  const candidateOffsets = offA === offB ? [offA] : [offA, offB]

  const valid: Array<{ instant: number; offset: number }> = []
  for (const offset of candidateOffsets) {
    const instant = wallAsUTCms - offset * 60_000
    if (zoneOffsetMinutes(instant, timezone) === offset) {
      valid.push({ instant, offset })
    }
  }

  if (valid.length === 1) {
    return { utcMs: valid[0]!.instant }
  }
  if (valid.length === 2) {
    const earlier = valid[0]!.offset > valid[1]!.offset ? valid[0]! : valid[1]!
    return { utcMs: earlier.instant, ambiguous: true }
  }
  // valid.length === 0 -> spring-forward gap.
  const smallOffset = Math.min(...candidateOffsets)
  return { utcMs: wallAsUTCms - smallOffset * 60_000, nonexistent: true }
}

/**
 * UTC offset in minutes (positive = east of UTC) for `timezone` at the
 * absolute instant `instantMs`. Derived by formatting the instant in the
 * zone and differencing against the same wall-clock fields read as UTC.
 * This asks ICU about a real instant, so it returns the historically
 * correct offset for that moment — including pre-standardisation LMT-style
 * offsets and every recorded DST rule change.
 */
function zoneOffsetMinutes(instantMs: number, timezone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = dtf.formatToParts(new Date(instantMs))
  const get = (type: string): number =>
    Number(parts.find((p) => p.type === type)?.value)
  let hour = get('hour')
  // Intl can emit hour "24" at midnight for hour12:false in some engines.
  if (hour === 24) hour = 0
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    hour,
    get('minute'),
    get('second')
  )
  return Math.round((asUTC - instantMs) / 60_000)
}
