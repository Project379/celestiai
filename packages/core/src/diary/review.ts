import { DIARY_MOODS } from './flow'
import type { DiaryFeeling, DiaryWeeklySummary } from './v2'

export interface DiaryReviewPeriod {
  from: string
  to: string
  label: string
}

/** Calendar weeks run Monday–Sunday, including across month and year boundaries. */
export function getDiaryReviewPeriod(entryDate: string): DiaryReviewPeriod {
  const start = new Date(`${entryDate}T12:00:00Z`)
  start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 6)
  const from = start.toISOString().slice(0, 10)
  const to = end.toISOString().slice(0, 10)
  return {
    from,
    to,
    label: `${from.split('-').reverse().join('.')} – ${to.split('-').reverse().join('.')}`,
  }
}

export function shiftDiaryReviewPeriod(period: DiaryReviewPeriod, direction: -1 | 1): DiaryReviewPeriod {
  const date = new Date(`${direction === -1 ? period.from : period.to}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + direction)
  return getDiaryReviewPeriod(date.toISOString().slice(0, 10))
}

export const DIARY_FEELING_COLORS: Record<DiaryFeeling, string> = {
  sad: '#60a5fa', anxious: '#67c4d9', mixed: '#c4b5c9', calm: '#f2c47a', joyful: '#fb923c',
}

/** Only explicit feelings contribute; missing days and legacy day scores have no weight. */
export function getDiaryReviewTone(feelings: Record<string, number> = {}) {
  let count = 0
  let total = 0
  for (const item of DIARY_MOODS) {
    const occurrences = feelings[item.feeling] ?? 0
    if (!Number.isFinite(occurrences) || occurrences <= 0) continue
    count += occurrences
    total += item.value * occurrences
  }
  if (!count) return null
  const average = total / count
  const lower = DIARY_MOODS[Math.floor(average) - 1]!
  const upper = DIARY_MOODS[Math.ceil(average) - 1]!
  const start = DIARY_FEELING_COLORS[lower.feeling]
  const end = DIARY_FEELING_COLORS[upper.feeling]
  const fraction = average - Math.floor(average)
  const color = '#' + [1, 3, 5].map((offset) => {
    const left = parseInt(start.slice(offset, offset + 2), 16)
    const right = parseInt(end.slice(offset, offset + 2), 16)
    return Math.round(left + (right - left) * fraction).toString(16).padStart(2, '0')
  }).join('')
  return { color, position: (average - 1) / 4, label: DIARY_MOODS[Math.round(average) - 1]!.label }
}

export interface DiaryReviewCardProps {
  period: DiaryReviewPeriod
  summary: DiaryWeeklySummary | null
  error: boolean
  canGoNext: boolean
  onPrevious: () => void
  onNext: () => void
}
