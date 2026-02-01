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
 * @param time - Time in HH:MM format
 * @returns Julian Day number
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
