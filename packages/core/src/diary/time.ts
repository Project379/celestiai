import { DIARY_TIMEZONE_DEFAULT } from './v2'

export function isValidTimeZone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format()
    return true
  } catch {
    return false
  }
}

export function getDiaryDate(
  date: Date = new Date(),
  timezone: string = DIARY_TIMEZONE_DEFAULT,
): string {
  const safeTimezone = isValidTimeZone(timezone) ? timezone : DIARY_TIMEZONE_DEFAULT
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: safeTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function zonedParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]))
  return {
    year: values.year!, month: values.month!, day: values.day!,
    hour: values.hour!, minute: values.minute!, second: values.second!,
  }
}

function localPartsToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number },
  timezone: string,
): Date {
  const desiredAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute)
  let candidate = desiredAsUtc
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const seen = zonedParts(new Date(candidate), timezone)
    const seenAsUtc = Date.UTC(
      seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, seen.second,
    )
    candidate = desiredAsUtc - (seenAsUtc - candidate)
  }
  return new Date(candidate)
}

export function getNextReminderDueAt(
  localTime: string,
  timezone: string,
  now: Date = new Date(),
): Date {
  const safeTimezone = isValidTimeZone(timezone) ? timezone : DIARY_TIMEZONE_DEFAULT
  const [hour, minute] = localTime.split(':').map(Number)
  const today = zonedParts(now, safeTimezone)
  let desired = { ...today, hour: hour!, minute: minute! }
  let due = localPartsToUtc(desired, safeTimezone)
  if (due.getTime() <= now.getTime()) {
    const nextDate = new Date(Date.UTC(today.year, today.month - 1, today.day + 1))
    desired = {
      year: nextDate.getUTCFullYear(),
      month: nextDate.getUTCMonth() + 1,
      day: nextDate.getUTCDate(),
      hour: hour!,
      minute: minute!,
      second: 0,
    }
    due = localPartsToUtc(desired, safeTimezone)
  }
  return due
}
