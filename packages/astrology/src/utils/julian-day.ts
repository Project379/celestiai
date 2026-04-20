/**
 * Julian Day conversion utilities
 *
 * Julian Day is the continuous count of days since the beginning of the Julian Period
 * on January 1, 4713 BC (Julian calendar). It's used in astronomy because it provides
 * a single continuous time scale.
 */

import * as sweph from 'sweph'

/**
 * Convert a date and time to Julian Day number
 *
 * @param date - The date (UTC)
 * @param time - Time in HH:MM format (treated as UTC)
 * @returns Julian Day number
 *
 * @remarks
 * The malformed-time throw below is defense-in-depth for internal
 * callers that construct inputs without going through a validator. On
 * the /api/birth-data HTTP surface, `apps/web/lib/validators/birth-data.ts`
 * enforces `/^([01]\d|2[0-3]):([0-5]\d)$/` before any value reaches
 * this function — a strict superset of what the guard rejects — so
 * the throw is unreachable from external input. Keep the guard
 * regardless: in-repo callers (transit calculations, internal probes,
 * future endpoints) may not share that discipline.
 *
 * @example
 * ```typescript
 * // June 15, 1990 at 14:30 UTC
 * const jd = getJulianDay(new Date('1990-06-15'), '14:30')
 * // Returns approximately 2448063.1
 * ```
 */
export function getJulianDay(date: Date, time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`getJulianDay: time must be "HH:MM", got "${time}"`)
  }
  const decimalHours = hours + minutes / 60

  // Use UTC methods to avoid timezone issues
  return sweph.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // JS months are 0-indexed
    date.getUTCDate(),
    decimalHours,
    sweph.constants.SE_GREG_CAL
  )
}

/**
 * Convert a date and UTC decimal hours to Julian Day number.
 *
 * Use this when the local→UTC time conversion has already been performed
 * (e.g. after applying timezone offset from geo-tz).
 *
 * @param date - The base date (UTC)
 * @param utcDecimalHours - UTC time as decimal hours (e.g. 14.5 = 14:30 UTC)
 * @param dayOffset - Day adjustment from timezone conversion (-1, 0, or +1)
 * @returns Julian Day number
 */
export function getJulianDayUTC(
  date: Date,
  utcDecimalHours: number,
  dayOffset: number = 0
): number {
  return sweph.julday(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate() + dayOffset,
    utcDecimalHours,
    sweph.constants.SE_GREG_CAL
  )
}
