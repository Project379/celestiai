/**
 * Timezone utilities for converting local birth time to UTC
 *
 * Astrology calculations require UTC time. Users enter their birth time
 * in local time, so we need to convert it based on the birth location's
 * timezone at the specific date of birth (including historical DST rules).
 */

import { find as findTimezone } from 'geo-tz'

/**
 * Convert a local birth time to UTC decimal hours, accounting for the
 * timezone at the given coordinates on the given date.
 *
 * @param date - The birth date
 * @param localTime - Birth time in HH:MM format (local time)
 * @param lat - Birth location latitude
 * @param lon - Birth location longitude
 * @returns Object with UTC decimal hours and possible date adjustment
 *
 * @example
 * ```typescript
 * // Birth at 10:30 local time in Sofia, Bulgaria (UTC+3 in summer)
 * const result = localTimeToUTC(new Date('2000-07-23'), '10:30', 42.70, 23.32)
 * // result.utcHours = 7.5 (10:30 - 3 hours)
 * // result.dayOffset = 0
 * ```
 */
export function localTimeToUTC(
  date: Date,
  localTime: string,
  lat: number,
  lon: number
): { utcHours: number; dayOffset: number } {
  // Look up timezone from coordinates
  const timezones = findTimezone(lat, lon)
  if (!timezones || timezones.length === 0) {
    // Fallback: treat as UTC if timezone cannot be determined
    const [hours, minutes] = localTime.split(':').map(Number)
    return { utcHours: hours + minutes / 60, dayOffset: 0 }
  }

  const timezone = timezones[0]

  // Parse local time
  const [localHours, localMinutes] = localTime.split(':').map(Number)

  // Construct a Date object in the birth timezone to find the UTC offset.
  // We build an ISO-like string and use Intl to resolve the offset.
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + 1
  const day = date.getUTCDate()

  // Create a date string in the local timezone
  const localDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${localTime}:00`

  // Use Intl.DateTimeFormat to get the UTC offset for this timezone on this date
  const utcOffsetMinutes = getUTCOffsetMinutes(localDateStr, timezone)

  // Convert local time to UTC
  const localTotalMinutes = localHours * 60 + localMinutes
  const utcTotalMinutes = localTotalMinutes - utcOffsetMinutes

  // Handle day boundary crossing
  let dayOffset = 0
  let adjustedMinutes = utcTotalMinutes

  if (adjustedMinutes < 0) {
    adjustedMinutes += 24 * 60
    dayOffset = -1
  } else if (adjustedMinutes >= 24 * 60) {
    adjustedMinutes -= 24 * 60
    dayOffset = 1
  }

  const utcHours = adjustedMinutes / 60

  return { utcHours, dayOffset }
}

/**
 * Get the UTC offset in minutes for a given timezone on a specific date/time.
 *
 * Uses a reliable method: compares the formatted local time parts with
 * the UTC interpretation to derive the actual offset, accounting for DST.
 *
 * @param localDateStr - ISO-format date string (without timezone), e.g. "2000-07-23T10:30:00"
 * @param timezone - IANA timezone name, e.g. "Europe/Sofia"
 * @returns UTC offset in minutes (positive = east of UTC, e.g. +180 for UTC+3)
 */
function getUTCOffsetMinutes(localDateStr: string, timezone: string): number {
  // Create a Date assuming the string is UTC, then format it in the target timezone
  // and compare to find the offset.
  //
  // Strategy: We create a "probe" date at a known UTC time, then see what local
  // time that corresponds to in the target timezone.

  // Parse the local date/time components
  const [datePart, timePart] = localDateStr.split('T')
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)

  // Create a date as if this time were UTC
  const probeUTC = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0))

  // Format this UTC moment in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(probeUTC)
  const localYear = Number(parts.find((p) => p.type === 'year')?.value)
  const localMonth = Number(parts.find((p) => p.type === 'month')?.value)
  const localDay = Number(parts.find((p) => p.type === 'day')?.value)
  const localHour = Number(parts.find((p) => p.type === 'hour')?.value)
  const localMinute = Number(parts.find((p) => p.type === 'minute')?.value)

  // Reconstruct the local time as a UTC date for comparison
  const localAsUTC = new Date(
    Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, 0)
  )

  // The difference between the local interpretation and UTC is the offset
  const offsetMs = localAsUTC.getTime() - probeUTC.getTime()
  return offsetMs / (60 * 1000)
}
