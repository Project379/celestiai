import { describe, expect, it } from 'vitest'
import { DIARY_FEELING_COLORS, getDiaryReviewPeriod, getDiaryReviewTone, shiftDiaryReviewPeriod } from '../../src/diary/review'
import { getDiaryDate } from '../../src/diary/time'

describe('Monday–Sunday diary review periods', () => {
  it.each([
    ['2026-10-01', '2026-09-28', '2026-10-04'],
    ['2026-10-07', '2026-10-05', '2026-10-11'],
    ['2026-10-08', '2026-10-05', '2026-10-11'],
    ['2026-10-12', '2026-10-12', '2026-10-18'],
    ['2026-10-17', '2026-10-12', '2026-10-18'],
    ['2026-10-18', '2026-10-12', '2026-10-18'],
    ['2026-10-19', '2026-10-19', '2026-10-25'],
    ['2026-10-28', '2026-10-26', '2026-11-01'],
    ['2026-10-31', '2026-10-26', '2026-11-01'],
    ['2026-04-30', '2026-04-27', '2026-05-03'],
    ['2026-02-28', '2026-02-23', '2026-03-01'],
    ['2028-02-29', '2028-02-28', '2028-03-05'],
  ])('groups %s from Monday through Sunday', (date, from, to) => {
    expect(getDiaryReviewPeriod(date)).toMatchObject({ from, to })
  })

  it('formats both dates with padded day, month and full year', () => {
    expect(getDiaryReviewPeriod('2026-01-01').label).toBe('29.12.2025 – 04.01.2026')
    expect(getDiaryReviewPeriod('2026-10-17').label).toBe('12.10.2026 – 18.10.2026')
  })

  it('navigates across months and year boundaries without gaps', () => {
    const january = getDiaryReviewPeriod('2027-01-01')
    const december = shiftDiaryReviewPeriod(january, -1)
    expect(january).toMatchObject({ from: '2026-12-28', to: '2027-01-03' })
    expect(december).toMatchObject({ from: '2026-12-21', to: '2026-12-27' })
    expect(shiftDiaryReviewPeriod(december, 1)).toEqual(january)
    expect(shiftDiaryReviewPeriod(getDiaryReviewPeriod('2026-03-02'), -1))
      .toMatchObject({ from: '2026-02-23', to: '2026-03-01' })
  })

  it('uses the diary timezone at a week boundary and across DST', () => {
    expect(getDiaryReviewPeriod(getDiaryDate(new Date('2026-10-18T22:30:00Z'), 'Europe/Sofia')))
      .toMatchObject({ from: '2026-10-19', to: '2026-10-25' })
    expect(getDiaryReviewPeriod(getDiaryDate(new Date('2026-10-25T01:30:00Z'), 'Europe/Sofia')))
      .toMatchObject({ from: '2026-10-19', to: '2026-10-25' })
    expect(getDiaryReviewPeriod(getDiaryDate(new Date('2026-03-29T01:30:00Z'), 'Europe/Sofia')))
      .toMatchObject({ from: '2026-03-23', to: '2026-03-29' })
  })
})

describe('diary feeling colors', () => {
  it('uses cool blue for sadness and warm orange for joy', () => {
    expect(getDiaryReviewTone({ sad: 4 })).toEqual({ color: DIARY_FEELING_COLORS.sad, position: 0, label: 'Тъжно' })
    expect(getDiaryReviewTone({ joyful: 3 })).toEqual({ color: DIARY_FEELING_COLORS.joyful, position: 1, label: 'Радостно' })
  })

  it('weights feelings by their occurrences rather than by distinct labels', () => {
    expect(getDiaryReviewTone({ sad: 3, joyful: 1 })).toMatchObject({ color: DIARY_FEELING_COLORS.anxious, position: 0.25 })
    expect(getDiaryReviewTone({ sad: 1, joyful: 1 })).toMatchObject({ color: DIARY_FEELING_COLORS.mixed, position: 0.5, label: 'Смесено' })
  })

  it('smoothly blends colors for intermediate averages', () => {
    const tone = getDiaryReviewTone({ calm: 1, joyful: 1 })!
    expect(tone.position).toBe(0.875)
    expect(tone.color).toBe('#f7ab5b')
  })

  it('leaves empty periods neutral and ignores legacy scores and invalid counts', () => {
    expect(getDiaryReviewTone()).toBeNull()
    expect(getDiaryReviewTone({ '1': 4, sad: 0, joyful: -1, anxious: NaN })).toBeNull()
    expect(getDiaryReviewTone({ sad: 1, unknown: 100 })).toEqual(getDiaryReviewTone({ sad: 1 }))
  })
})
