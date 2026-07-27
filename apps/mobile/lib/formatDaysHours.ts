// Extracted from LunarPhaseCard.tsx (2026-07-27) — this exact phrasing was
// already shipped there for the same "time until X" concept (next major
// lunar phase / meteor peak); Днес's "days to full moon" line was written
// independently and never used it, producing raw "2.2 days" instead. Real
// existing copy, not a new register: whole-day rounding, correct Bulgarian
// pluralization (1 ден vs. N дни, 1 час vs. N часа), hours under a day.
export function formatDaysHours(daysFrac: number): string {
  const totalHours = Math.max(0, Math.round(daysFrac * 24))
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  const dayStr = days === 0 ? '' : days === 1 ? '1 ден' : `${days} дни`
  const hourStr = hours === 0 ? '' : hours === 1 ? '1 час' : `${hours} часа`
  if (dayStr && hourStr) return `${dayStr} и ${hourStr}`
  if (dayStr) return dayStr
  if (hourStr) return hourStr
  return 'по-малко от час'
}
