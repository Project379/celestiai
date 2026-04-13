import type { ApproximateTimeRange } from '@/lib/validators/birth-data'

const RANGE_HOURS: Record<ApproximateTimeRange, [number, number]> = {
  night: [0, 6],
  morning: [6, 12],
  afternoon: [12, 18],
  evening: [18, 24],
}

function dateAtUtcHour(date: string, hour: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0))
}

export function toApproximateTimeRangeLiteral(
  birthDate: string,
  range: ApproximateTimeRange | null | undefined
): string | null {
  if (!range) return null

  const [startHour, endHour] = RANGE_HOURS[range]
  const start = dateAtUtcHour(birthDate, startHour)
  const end = dateAtUtcHour(birthDate, endHour)

  return `["${start.toISOString()}","${end.toISOString()}")`
}

export function fromApproximateTimeRangeLiteral(
  value: string | null | undefined
): ApproximateTimeRange | null {
  if (!value) return null

  if (value.includes('06:00:00') && value.includes('12:00:00')) {
    return 'morning'
  }
  if (value.includes('12:00:00') && value.includes('18:00:00')) {
    return 'afternoon'
  }
  if (value.includes('18:00:00')) {
    return 'evening'
  }
  if (value.includes('00:00:00') && value.includes('06:00:00')) {
    return 'night'
  }

  return null
}

export function normalizeChartBirthTime<T extends { birth_time?: string | null }>(
  chart: T
): T {
  return {
    ...chart,
    birth_time: chart.birth_time?.slice(0, 5) ?? null,
  }
}

export function normalizeChartApproximateRange<
  T extends { approximate_time_range?: string | null },
>(chart: T): T {
  return {
    ...chart,
    approximate_time_range: fromApproximateTimeRangeLiteral(
      chart.approximate_time_range
    ),
  }
}

export function normalizeBirthDataChart<
  T extends {
    birth_time?: string | null
    approximate_time_range?: string | null
  },
>(chart: T): T {
  return normalizeChartApproximateRange(normalizeChartBirthTime(chart))
}
