import { describe, expect, it } from 'vitest'

import { countWrappedLines, fitsHoroscopePart, fitsMonthText } from '../../src/dnes/text-fit'

describe('text-fit (two lines on the 360px floor)', () => {
  it('a short part fits and a long legacy sentence does not', () => {
    expect(fitsHoroscopePart('Юпитер подкрепя Луната ти: разговорите днес са по-топли.')).toBe(true)
    expect(fitsHoroscopePart('Днес транзитното Слънце оформя силен секстил, който събужда у теб скрита решителност и дълбока увереност.')).toBe(false)
  })

  it('counts a single word as one line and wraps greedily', () => {
    expect(countWrappedLines('Привет', 16, 304)).toBe(1)
    const long = 'дума '.repeat(40).trim()
    expect(countWrappedLines(long, 16, 304)).toBeGreaterThan(3)
  })

  it('the monthly sample from the approved mock fits at 15px', () => {
    expect(fitsMonthText('Сезонът ти е в разгара си. Месецът е за решения, които отлагаш от лятото.')).toBe(true)
  })

  it('is conservative: a 59-character part is on the edge (292px column: 304 minus the 6px level inset each side), 80 is over', () => {
    const w = 'думи '
    expect(fitsHoroscopePart((w.repeat(12)).trim())).toBe(true) // 59 chars
    expect(fitsHoroscopePart((w.repeat(16)).trim())).toBe(false) // 79 chars
    // the month page is not inset: 304px, so it still takes what 304 took
    expect(countWrappedLines((w.repeat(13)).trim(), 16, 304)).toBeLessThanOrEqual(2)
  })
})
