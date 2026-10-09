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

  it('the monthly sample from the approved mock fits two lines at 15px', () => {
    expect(fitsMonthText('Сезонът ти е в разгара си. Месецът е за решения, които отлагаш от лятото.')).toBe(true)
  })

  it('is conservative: a 64-character part is on the edge, 80 is over', () => {
    const w = 'думи '
    expect(fitsHoroscopePart((w.repeat(13)).trim())).toBe(true) // 64 chars
    expect(fitsHoroscopePart((w.repeat(16)).trim())).toBe(false) // 79 chars
  })
})
